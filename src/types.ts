export type UserRole = 'admin' | 'auditor' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email: string;
  authCode: string;
  points: number;
  avatar?: string;
  registrationDate: string;
  status: 'Active' | 'Banned';
  hasSignedAgreement: boolean;
}

export interface Vulnerability {
  id: string;
  title: string;
  url: string;
  type: string;
  level: '严重' | '高危' | '中危' | '低危' | '信息';
  status: string;
  author: string;
  date: string;
  description: string;
  attachment?: string;
  attachmentType?: string;
  auditNote?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

export interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: '简单' | '中等' | '困难';
  category: string;
  points: number;
  url: string;
  image: string;
}

export interface Material {
  id: string;
  title: string;
  author: string;
  date: string;
  type: 'PDF' | 'Video' | 'Link' | 'Zip';
  url: string;
  image: string;
  description: string;
}

export interface Discussion {
  id: string;
  title: string;
  author: string;
  date: string;
  replies: number;
  category: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  status: 'Active' | 'Out of Stock' | 'Inactive';
}

export interface Redemption {
  id: string;
  userId: string;
  username: string;
  productId: string;
  productName: string;
  productImage: string;
  points: number;
  date: string;
  status: 'Pending' | 'Issued';
}
