import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import Navbar from '../components/Navbar';
import Home from './Home';
import VulnAudit from './VulnAudit';
import VulnManage from './VulnManage';
import UserManage from './UserManage';
import AnnouncementManage from './AnnouncementManage';
import CertificateManage from './CertificateManage';
import MallManage from './MallManage';
import UserNotices from './UserNotices';
import VulnSubmit from './VulnSubmit';
import Mall from './Mall';
import Leaderboard from './Leaderboard';
import MyVulnerabilities from './MyVulnerabilities';
import CertificateSearch from './CertificateSearch';
import Logs from './Logs';
import LearningCenter from './LearningCenter';
import LearningManage from './LearningManage';
import ProfileCenter from './ProfileCenter';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldAlert, CheckCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export default function Dashboard({ user, onLogout, onUpdateUser, isDarkMode, toggleTheme }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [showResponsibilityModal, setShowResponsibilityModal] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (user && !user.hasSignedAgreement) {
      setShowResponsibilityModal(true);
    }
  }, [user]);

  const handleSignAgreement = async () => {
    setIsSigning(true);
    try {
      const response = await fetch(`/api/users/${user.id}/sign-agreement`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        onUpdateUser({ ...user, hasSignedAgreement: true });
        setShowResponsibilityModal(false);
      }
    } catch (error) {
      console.error('Failed to sign agreement:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const renderView = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} setActiveTab={setActiveTab} />;
      case 'audit': return <VulnAudit />;
      case 'vulns': return <VulnManage />;
      case 'users': return <UserManage />;
      case 'notices': return <AnnouncementManage user={user} />;
      case 'certs': return <CertificateManage />;
      case 'mall_manage': return <MallManage />;
      case 'user_notices': return <UserNotices />;
      case 'submit': return <VulnSubmit user={user} />;
      case 'my_vulns': return <MyVulnerabilities user={user} />;
      case 'cert_search': return <CertificateSearch user={user} />;
      case 'mall': return <Mall user={user} onUpdateUser={onUpdateUser} />;
      case 'leaderboard': return <Leaderboard />;
      case 'learning': return <LearningCenter user={user} />;
      case 'learning_manage': return <LearningManage />;
      case 'logs': return <Logs />;
      case 'profile_center': return <ProfileCenter user={user} onUpdateUser={onUpdateUser} />;
      default: return <div className="p-8 text-center opacity-50">模块开发中...</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            © 2024 CQUPT-SRC 校园漏洞响应与产教融合平台. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Responsibility Statement Modal */}
      <AnimatePresence>
        {showResponsibilityModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-primary-50/50 dark:bg-primary-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">网络安全责任承诺书</h3>
                </div>
                <button onClick={() => setShowResponsibilityModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto text-sm text-gray-600 dark:text-slate-400 leading-relaxed space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-4 rounded-xl text-amber-800 dark:text-amber-200 flex gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">提示：根据国家相关法律法规及平台规定，在进行漏洞提交前，您必须签署本责任承诺书。</p>
                </div>

                <div className="space-y-4">
                  <p>本人（以下简称“承诺人”）作为 CQUPT-SRC 平台的注册用户，为维护校园网络安全，规范漏洞测试行为，特作出如下承诺：</p>
                  
                  <div className="space-y-3">
                    <p className="font-bold text-gray-800 dark:text-slate-200">1. 合规测试原则</p>
                    <p>承诺人在进行漏洞发现和测试过程中，将严格遵守《中华人民共和国网络安全法》、《数据安全法》等相关法律法规，仅在平台授权的范围内进行技术研究。</p>
                    
                    <p className="font-bold text-gray-800 dark:text-slate-200">2. 禁止破坏行为</p>
                    <p>严禁利用漏洞进行任何破坏系统稳定性、篡改业务数据、窃取用户信息或植入后门程序等违法违规行为。测试过程应尽量避免对正常业务造成影响。</p>
                    
                    <p className="font-bold text-gray-800 dark:text-slate-200">3. 保密义务</p>
                    <p>承诺人对在测试过程中获知的任何非公开信息（包括但不限于系统架构、漏洞详情、敏感数据等）负有严格的保密义务。未经平台书面许可，不得向任何第三方披露或在互联网公开。</p>
                    
                    <p className="font-bold text-gray-800 dark:text-slate-200">4. 成果归属</p>
                    <p>承诺人提交的漏洞报告及相关技术成果，其知识产权及处置权归平台所有。承诺人不得利用相关成果进行商业牟利。</p>
                    
                    <p className="font-bold text-gray-800 dark:text-slate-200">5. 法律责任</p>
                    <p>如承诺人违反上述承诺，产生的一切法律后果由承诺人本人承担。平台有权立即终止服务、封禁账号，并配合公安机关追究相关法律责任。</p>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                    <p className="text-center font-bold text-gray-900 dark:text-white mb-2">承诺人：{user.username}</p>
                    <p className="text-center text-xs text-gray-500">签署日期：{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                <button 
                  onClick={handleSignAgreement}
                  disabled={isSigning}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSigning ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      本人已阅读并签署承诺书
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-gray-400">签署即代表您同意承担相应的网络安全法律责任</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
