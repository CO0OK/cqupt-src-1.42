import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Database
  const users = [
    { id: "admin", username: "admin", password: "admin", role: "admin", email: "admin@cqupt.edu.cn", authCode: "000001", points: 9999, registrationDate: "2023-01-01", status: "Active", hasSignedAgreement: true },
    { id: "shenhe", username: "shenhe", password: "shenhe", role: "auditor", email: "shenhe@cqupt.edu.cn", authCode: "000002", points: 5000, registrationDate: "2023-06-15", status: "Active", hasSignedAgreement: true },
    { id: "temp", username: "temp", password: "temp", role: "user", email: "temp@cqupt.edu.cn", authCode: "2024001", points: 1200, registrationDate: "2024-01-10", status: "Active", hasSignedAgreement: false },
  ];

  const vulnerabilities = [
    { id: "VU-2024-001", title: "核心教务系统SQL注入漏洞", url: "jwzx.cqupt.edu.cn", type: "SQL注入", level: "严重", status: "修复中", author: "temp", date: "2024-03-24", description: "存在明显的SQL注入风险...", auditNote: "" },
    { id: "VU-2024-002", title: "图书管理系统未授权访问", url: "lib.cqupt.edu.cn", type: "权限绕过", level: "高危", status: "已审核", author: "temp", date: "2024-03-22", description: "未授权即可访问敏感数据...", auditNote: "" },
    { id: "VU-2024-003", title: "宿舍网络中心反射型XSS", url: "net.cqupt.edu.cn", type: "XSS跨站脚本", level: "中危", status: "已修复", author: "temp", date: "2024-03-20", description: "输入框未过滤导致脚本执行...", auditNote: "" },
    { id: "VU-2024-004", title: "研究生院信息门户逻辑漏洞", url: "yjs.cqupt.edu.cn", type: "逻辑漏洞", level: "高危", status: "待处理", author: "temp", date: "2024-03-25", description: "通过修改参数可以越权查看其他学生成绩...", auditNote: "" },
    { id: "VU-2024-005", title: "校园卡充值平台信息泄露", url: "ecard.cqupt.edu.cn", type: "信息泄露", level: "中危", status: "待处理", author: "temp", date: "2024-03-26", description: "接口返回了过多的用户隐私字段...", auditNote: "" },
  ];

  const certificates = [
    { id: "CERT-2024-001", vulnId: "VU-2024-002", username: "temp", date: "2024-03-23", title: "图书管理系统未授权访问 - 荣誉证书", type: "Honorary", status: "Active" }
  ];

  const announcements = [
    { id: 1, title: "关于开展2024年春季网络安全专项检查的通知", content: "为了进一步加强校园网络安全，定于本月开展专项检查...", date: "2024-03-15", author: "admin", type: "安全通知", isPinned: true },
    { id: 2, title: "CQUPT-SRC 积分商城礼品上新公告", content: "积分商城已上线多款定制礼品，欢迎各位白帽子兑换...", date: "2024-03-10", author: "admin", type: "商城动态", isPinned: false },
  ];

  const labs = [
    { id: "LAB-001", title: "基础SQL注入实战", description: "通过本靶场，您将学习如何识别和利用最基础的UNION型SQL注入漏洞，获取数据库敏感信息。", difficulty: "简单", category: "Web安全", points: 100, url: "https://lab.cqupt.edu.cn/sql-1", image: "https://picsum.photos/seed/sql/800/450" },
    { id: "LAB-002", title: "XSS跨站脚本攻击进阶", description: "深入理解反射型与存储型XSS的区别，学习如何绕过常见的WAF过滤规则。", difficulty: "中等", category: "Web安全", points: 200, url: "https://lab.cqupt.edu.cn/xss-2", image: "https://picsum.photos/seed/xss/800/450" },
    { id: "LAB-003", title: "Linux权限提升技巧", description: "探索Linux系统中的SUID权限、内核漏洞及配置不当导致的提权路径。", difficulty: "困难", category: "系统安全", points: 500, url: "https://lab.cqupt.edu.cn/privesc-1", image: "https://picsum.photos/seed/linux/800/450" },
    { id: "LAB-004", title: "JWT身份验证绕过", description: "学习JWT的结构，以及由于密钥过弱或算法配置不当导致的身份伪造攻击。", difficulty: "中等", category: "逻辑漏洞", points: 300, url: "https://lab.cqupt.edu.cn/jwt-1", image: "https://picsum.photos/seed/jwt/800/450" },
    { id: "LAB-005", title: "CTF入门杂项练习", description: "包含编码转换、隐写术基础等多种CTF入门必备知识点。", difficulty: "简单", category: "其他", points: 150, url: "https://lab.cqupt.edu.cn/misc-1", image: "https://picsum.photos/seed/misc/800/450" },
  ];

  const materials = [
    { id: "MAT-001", title: "OWASP Top 10 2024 深度解析", author: "admin", date: "2024-03-01", type: "技术文档", url: "#", description: "详细解读最新版OWASP十大安全风险。" },
    { id: "MAT-002", title: "Burp Suite 零基础实战教程", author: "WhiteHat_Zero", date: "2024-02-15", type: "视频教程", url: "#", description: "从安装到高级插件使用的全过程演示。" },
    { id: "MAT-003", title: "常用渗透测试工具集锦", author: "admin", date: "2024-01-20", type: "工具插件", url: "#", description: "整理了Web渗透、内网渗透常用的各类工具。" },
    { id: "MAT-004", title: "某大型企业内网渗透案例分享", author: "Security_Bob", date: "2024-03-10", type: "实战案例", url: "#", description: "通过真实案例学习内网渗透的思路与技巧。" },
    { id: "MAT-005", title: "SRC平台通用规则说明", author: "admin", date: "2024-03-20", type: "其他", url: "#", description: "关于平台漏洞提交、审核及奖励的详细规则。" },
  ];

  const discussions = [
    { id: "DIS-001", title: "关于最新教务系统漏洞的修复建议", author: "temp", date: "2024-03-25", replies: 12, category: "技术交流" },
    { id: "DIS-002", title: "新手如何快速入门CTF？", author: "Security_Bob", date: "2024-03-22", replies: 45, category: "经验分享" },
    { id: "DIS-003", title: "求推荐好用的内网穿透工具", author: "WhiteHat_Zero", date: "2024-03-20", replies: 8, category: "求助咨询" },
  ];

  const products = [
    { id: 'P001', name: 'CQUPT 极客卫衣', price: 5000, stock: 45, category: '服饰', image: 'https://picsum.photos/seed/hoodie/200', status: 'In Stock' },
    { id: 'P002', name: '机械键盘 (定制版)', price: 12000, stock: 12, category: '数码', image: 'https://picsum.photos/seed/keyboard/200', status: 'In Stock' },
    { id: 'P003', name: 'SRC 专属徽章', price: 500, stock: 200, category: '周边', image: 'https://picsum.photos/seed/badge/200', status: 'In Stock' },
    { id: 'P004', name: '京东卡 100元', price: 10000, stock: 0, category: '礼品卡', image: 'https://picsum.photos/seed/card/200', status: 'Out of Stock' },
  ];

  const redemptions = [
    { id: 'R001', userId: 'temp', username: 'temp', productId: 'P003', productName: 'SRC 专属徽章', productImage: 'https://picsum.photos/seed/badge/200', points: 500, date: '2024-03-10', status: 'Issued' }
  ];

  // Auth Endpoints
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, email: user.email, authCode: user.authCode, points: user.points, hasSignedAgreement: user.hasSignedAgreement } });
    } else {
      res.status(401).json({ success: false, message: "账号或密码错误" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { username, authCode, password, email } = req.body;
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, message: "用户名已存在" });
    }
    const newUser = { id: username, username, password, role: "user", email, authCode, points: 0, registrationDate: new Date().toISOString().split('T')[0], status: "Active", hasSignedAgreement: false };
    users.push(newUser);
    res.json({ success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role, points: newUser.points, hasSignedAgreement: newUser.hasSignedAgreement } });
  });

  // Vuln Endpoints
  app.get("/api/vulnerabilities", (req, res) => {
    res.json(vulnerabilities);
  });

  app.post("/api/vulnerabilities", (req, res) => {
    const vuln = { ...req.body, id: `VU-2024-00${vulnerabilities.length + 1}`, date: new Date().toISOString().split('T')[0], status: "待处理", auditNote: "" };
    vulnerabilities.push(vuln);
    res.json({ success: true, vuln });
  });

  app.patch("/api/vulnerabilities/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const index = vulnerabilities.findIndex(v => v.id === id);
    if (index !== -1) {
      vulnerabilities[index] = { ...vulnerabilities[index], ...updates };
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "漏洞不存在" });
    }
  });

  // Announcement Endpoints
  app.get("/api/announcements", (req, res) => {
    res.json(announcements);
  });

  app.post("/api/announcements", (req, res) => {
    const announcement = { ...req.body, id: announcements.length + 1, date: new Date().toISOString().split('T')[0] };
    announcements.push(announcement);
    res.json({ success: true, announcement });
  });

  app.delete("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    const index = announcements.findIndex(a => a.id === parseInt(id));
    if (index !== -1) {
      announcements.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "公告不存在" });
    }
  });

  app.put("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, type, isPinned } = req.body;
    const index = announcements.findIndex(a => a.id === parseInt(id));
    if (index !== -1) {
      announcements[index] = { ...announcements[index], title, content, type, isPinned };
      res.json({ success: true, announcement: announcements[index] });
    } else {
      res.status(404).json({ success: false, message: "公告不存在" });
    }
  });

  // User Endpoints
  app.get("/api/users", (req, res) => {
    res.json(users.map(u => ({ 
      id: u.id, 
      username: u.username, 
      role: u.role, 
      email: u.email, 
      authCode: u.authCode, 
      points: u.points,
      registrationDate: u.registrationDate,
      status: u.status,
      hasSignedAgreement: u.hasSignedAgreement
    })));
  });

  app.post("/api/users", (req, res) => {
    const { username, email, role, authCode, points, status } = req.body;
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      email,
      role,
      authCode,
      points: points || 0,
      password: "password123",
      registrationDate: new Date().toISOString().split('T')[0],
      status: status || 'Active',
      hasSignedAgreement: false
    };
    users.push(newUser);
    res.status(201).json({ success: true, user: newUser });
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      res.json({ success: true, user: users[index] });
    } else {
      res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  app.post("/api/users/:id/reset-password", (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index].password = newPassword || "123456"; // Default password if none provided
      res.json({ success: true, message: "密码重置成功" });
    } else {
      res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  app.post("/api/users/:id/sign-agreement", (req, res) => {
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index].hasSignedAgreement = true;
      res.json({ success: true, user: users[index] });
    } else {
      res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  // Certificate Endpoints
  app.get("/api/certificates", (req, res) => {
    res.json(certificates);
  });

  app.post("/api/certificates", (req, res) => {
    const { vulnId, username, title, type } = req.body;
    const cert = { 
      id: `CERT-2024-00${certificates.length + 1}`, 
      vulnId, 
      username, 
      title, 
      type: type || "Honorary",
      status: "Active",
      date: new Date().toISOString().split('T')[0] 
    };
    certificates.push(cert);
    res.json({ success: true, cert });
  });

  app.get("/api/certificates/search", (req, res) => {
    const { id } = req.query;
    const cert = certificates.find(c => c.id === id);
    if (cert) {
      res.json(cert);
    } else {
      res.status(404).json({ message: "Certificate not found" });
    }
  });

  app.delete("/api/certificates/:id", (req, res) => {
    const { id } = req.params;
    const index = certificates.findIndex(c => c.id === id);
    if (index !== -1) {
      certificates.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Certificate not found" });
    }
  });

  // Learning Center Endpoints
  app.get("/api/learning/labs", (req, res) => {
    res.json(labs);
  });

  app.get("/api/learning/materials", (req, res) => {
    res.json(materials);
  });

  app.get("/api/learning/discussions", (req, res) => {
    res.json(discussions);
  });

  // Mall Endpoints
  app.get("/api/mall/products", (req, res) => {
    res.json(products);
  });

  app.post("/api/mall/products", (req, res) => {
    const product = { ...req.body, id: `P00${products.length + 1}` };
    products.push(product);
    res.json({ success: true, product });
  });

  app.get("/api/mall/redemptions", (req, res) => {
    const { userId } = req.query;
    if (userId) {
      res.json(redemptions.filter(r => r.userId === userId));
    } else {
      res.json(redemptions);
    }
  });

  app.post("/api/mall/redemptions", (req, res) => {
    const { userId, productId } = req.body;
    const user = users.find(u => u.id === userId);
    const product = products.find(p => p.id === productId);

    if (!user || !product) {
      return res.status(404).json({ success: false, message: "用户或商品不存在" });
    }

    if (user.points < product.price) {
      return res.status(400).json({ success: false, message: "积分不足" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: "库存不足" });
    }

    // Deduct points and update stock
    user.points -= product.price;
    product.stock -= 1;
    if (product.stock === 0) product.status = 'Out of Stock';

    const redemption = {
      id: `R00${redemptions.length + 1}`,
      userId: user.id,
      username: user.username,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      points: product.price,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };

    redemptions.push(redemption);
    res.json({ success: true, redemption, userPoints: user.points });
  });

  app.patch("/api/mall/redemptions/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const index = redemptions.findIndex(r => r.id === id);
    if (index !== -1) {
      redemptions[index].status = status;
      res.json({ success: true, redemption: redemptions[index] });
    } else {
      res.status(404).json({ success: false, message: "兑换记录不存在" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
