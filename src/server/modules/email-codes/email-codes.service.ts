import nodemailer from "nodemailer";
import { createClient } from "redis";

export type EmailCodeScene = "register" | "change_password" | "forgot_password" | "change_email";

export type EmailCodeRecord = {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  failedAttempts: number;
};

export type EmailCodeStore = {
  get(key: string): Promise<EmailCodeRecord | null>;
  set(key: string, record: EmailCodeRecord, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
};

export type EmailCodeSender = {
  sendCode(input: { email: string; code: string; scene: EmailCodeScene; expiresInSec: number }): Promise<void>;
};

export type EmailCodeSendResult = {
  code: string;
  expiresInSec: number;
  cooldownInSec: number;
};

export class MemoryEmailCodeStore implements EmailCodeStore {
  private readonly store = new Map<string, EmailCodeRecord>();

  async get(key: string): Promise<EmailCodeRecord | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, record: EmailCodeRecord): Promise<void> {
    this.store.set(key, record);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class RedisEmailCodeStore implements EmailCodeStore {
  constructor(private readonly client: MinimalRedisClient) {}

  async get(key: string): Promise<EmailCodeRecord | null> {
    const raw = await this.client.get(key);
    if (typeof raw !== "string" || !raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<EmailCodeRecord>;
      if (
        typeof parsed.code !== "string" ||
        typeof parsed.expiresAt !== "number" ||
        typeof parsed.lastSentAt !== "number" ||
        typeof parsed.failedAttempts !== "number"
      ) {
        return null;
      }
      return {
        code: parsed.code,
        expiresAt: parsed.expiresAt,
        lastSentAt: parsed.lastSentAt,
        failedAttempts: parsed.failedAttempts,
      };
    } catch {
      return null;
    }
  }

  async set(key: string, record: EmailCodeRecord, ttlMs: number): Promise<void> {
    const ttl = Math.max(1000, Math.floor(ttlMs));
    await this.client.set(key, JSON.stringify(record), { PX: ttl });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  static async createFromUrl(redisUrl: string): Promise<RedisEmailCodeStore> {
    const client = createClient({ url: redisUrl });
    client.on("error", (error) => {
      console.error("Redis client error:", error);
    });
    await client.connect();
    return new RedisEmailCodeStore(client);
  }
}

export class ConsoleEmailCodeSender implements EmailCodeSender {
  async sendCode(input: { email: string; code: string; scene: EmailCodeScene; expiresInSec: number }): Promise<void> {
    const sceneLabel = input.scene === "register" ? "注册" : input.scene === "change_password" ? "修改密码" : input.scene === "change_email" ? "修改邮箱" : "找回密码";
    console.log(
      `[EmailCode][DEV] ${sceneLabel} 验证码 -> email=${input.email}, code=${input.code}, expiresInSec=${input.expiresInSec}`,
    );
  }
}

export class SmtpEmailCodeSender implements EmailCodeSender {
  private readonly transporter: nodemailer.Transporter;

  constructor(options: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  }) {
    const auth = options.user && options.pass ? { user: options.user, pass: options.pass } : undefined;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth,
    });
    this.from = options.from;
  }

  private readonly from: string;

  async sendCode(input: { email: string; code: string; scene: EmailCodeScene; expiresInSec: number }): Promise<void> {
    const sceneLabel = input.scene === "register" ? "注册" : input.scene === "change_password" ? "修改密码" : input.scene === "change_email" ? "修改邮箱" : "找回密码";
    const subject = `CQUPT-SRC ${sceneLabel}验证码`;
    const text = [
      `你正在进行 ${sceneLabel} 操作。`,
      `验证码：${input.code}`,
      `有效期：${Math.floor(input.expiresInSec / 60)} 分钟`,
      "若非本人操作，请忽略本邮件。",
    ].join("\n");

    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      subject,
      text,
    });
  }
}

export class EmailCodesService {
  private readonly store: EmailCodeStore;

  private readonly sender: EmailCodeSender;

  private readonly ttlMs: number;

  private readonly resendIntervalMs: number;

  private readonly maxFailedAttempts: number;

  constructor(options?: {
    store?: EmailCodeStore;
    sender?: EmailCodeSender;
    ttlMs?: number;
    resendIntervalMs?: number;
    maxFailedAttempts?: number;
  }) {
    this.store = options?.store ?? new MemoryEmailCodeStore();
    this.sender = options?.sender ?? new ConsoleEmailCodeSender();
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
    this.resendIntervalMs = options?.resendIntervalMs ?? 60 * 1000;
    this.maxFailedAttempts = options?.maxFailedAttempts ?? 5;
  }

  async send(email: string, scene: EmailCodeScene): Promise<EmailCodeSendResult> {
    const key = this.buildKey(email, scene);
    const now = Date.now();
    const prev = await this.store.get(key);
    if (prev && now - prev.lastSentAt < this.resendIntervalMs) {
      throw new Error("SEND_TOO_FREQUENT");
    }

    const code = this.generateCode();
    const expiresAt = now + this.ttlMs;
    const record: EmailCodeRecord = {
      code,
      expiresAt,
      lastSentAt: now,
      failedAttempts: 0,
    };
    await this.store.set(key, record, this.ttlMs);

    const expiresInSec = Math.floor(this.ttlMs / 1000);
    await this.sender.sendCode({
      email: email.trim().toLowerCase(),
      code,
      scene,
      expiresInSec,
    });

    return {
      code,
      expiresInSec,
      cooldownInSec: Math.floor(this.resendIntervalMs / 1000),
    };
  }

  async verify(email: string, scene: EmailCodeScene, code: string, consume = true): Promise<boolean> {
    const key = this.buildKey(email, scene);
    const now = Date.now();
    const record = await this.store.get(key);
    if (!record) {
      throw new Error("CODE_NOT_FOUND");
    }
    if (record.expiresAt < now) {
      await this.store.delete(key);
      throw new Error("CODE_EXPIRED");
    }

    const normalizedCode = code.trim();
    if (record.code !== normalizedCode) {
      record.failedAttempts += 1;
      if (record.failedAttempts >= this.maxFailedAttempts) {
        await this.store.delete(key);
      } else {
        await this.store.set(key, record, record.expiresAt - now);
      }
      throw new Error("CODE_INVALID");
    }

    if (consume) {
      await this.store.delete(key);
    }
    return true;
  }

  private generateCode(): string {
    return String(Math.floor(Math.random() * 900000) + 100000);
  }

  private buildKey(email: string, scene: EmailCodeScene): string {
    return `email_code:${scene}:${email.trim().toLowerCase()}`;
  }
}
type MinimalRedisClient = {
  connect(): Promise<unknown>;
  get(key: string): Promise<unknown>;
  set(key: string, value: string, options: { PX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  on(event: "error", listener: (error: unknown) => void): unknown;
};
