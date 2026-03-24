import { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', icon: 'Home', roles: ['admin', 'auditor', 'user'] },
  { id: 'audit', label: '漏洞审核', icon: 'ClipboardCheck', roles: ['admin', 'auditor'] },
  { id: 'vulns', label: '漏洞管理', icon: 'Database', roles: ['admin', 'auditor'] },
  { id: 'certs', label: '证书管理', icon: 'Award', roles: ['admin', 'auditor'] },
  { id: 'mall_manage', label: '商城管理', icon: 'ShoppingBag', roles: ['admin'] },
  { id: 'users', label: '用户管理', icon: 'Users', roles: ['admin'] },
  { id: 'notices', label: '公告管理', icon: 'Megaphone', roles: ['admin', 'auditor'] },
  { id: 'learning_manage', label: '学习管理', icon: 'BookOpen', roles: ['admin', 'auditor'] },
  { id: 'logs', label: '查看日志', icon: 'FileText', roles: ['admin', 'auditor'] },
  
  // User specific
  { id: 'submit', label: '漏洞提交', icon: 'ShieldPlus', roles: ['user'] },
  { id: 'my_vulns', label: '我的漏洞', icon: 'ShieldCheck', roles: ['user'] },
  { id: 'cert_search', label: '证书查询', icon: 'Award', roles: ['user'] },
  { id: 'mall', label: '积分商城', icon: 'ShoppingBag', roles: ['user'] },
  { id: 'leaderboard', label: '排行榜', icon: 'Trophy', roles: ['user'] },
  { id: 'learning', label: '学习中心', icon: 'BookOpen', roles: ['user'] },
  { id: 'user_notices', label: '公告', icon: 'Bell', roles: ['user'] },
];

export const VULN_TYPES = ['SQL注入', 'XSS跨站脚本', 'RCE远程代码执行', '权限绕过', '信息泄露', '逻辑漏洞', '其他'];
export const VULN_LEVELS = ['严重', '高危', '中危', '低危', '信息'];
