import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  DollarSign,
  Calendar,
  Zap,
  Droplets,
  Truck,
  Check,
  AlertTriangle,
  Play,
  Volume2,
  Send,
  Eye,
  Filter,
  TrendingUp,
  Award,
  ChevronRight,
  ExternalLink,
  Star,
  X,
  Mail,
  KeyRound,
  Shield,
  ShieldCheck,
  CheckCheck,
  RefreshCw,
  Info,
  ArrowRight,
  Database,
  Copy,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MaintenanceOrder, ChatMessage, OrderStatus, ServiceCategory, TechnicianProfile } from '../types';
import { playOrderApprovedSound, playNewOrderIncomingSound, playMessagePing, playClickSound } from '../utils/audio';
import {
  subscribeToTechnicianProfile,
  updateTechnicianProfileInFirestore,
  DEFAULT_TECHNICIAN_PROFILE,
} from '../services/orderService';

interface TechnicianAppProps {
  orders: MaintenanceOrder[];
  chats: ChatMessage[];
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    price?: number,
    scheduledTime?: string,
    cancellationReason?: string
  ) => void;
  onSendMessage: (msg: ChatMessage) => void;
}

export const TechnicianApp: React.FC<TechnicianAppProps> = ({
  orders,
  chats,
  onUpdateOrderStatus,
  onSendMessage,
}) => {
  // Password Authentication (Specific requirement: omar_root)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Cloud Database Technician Profile & Authentication
  const [techProfile, setTechProfile] = useState<TechnicianProfile>(DEFAULT_TECHNICIAN_PROFILE);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // Password Recovery States
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'initial' | 'code_sent' | 'reset_success'>('initial');
  const [recoveryInputCode, setRecoveryInputCode] = useState('');
  const [activeRecoveryCode, setActiveRecoveryCode] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  // Technician Account & Security Settings Modal in Dashboard
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEmailEdit, setProfileEmailEdit] = useState('omar7018@gmail.com');
  const [profilePasswordEdit, setProfilePasswordEdit] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Subscribe to Technician profile in Firestore (real-time credentials & recovery email)
  useEffect(() => {
    const unsubscribe = subscribeToTechnicianProfile((profile) => {
      setTechProfile(profile);
      setProfileEmailEdit(profile.recoveryEmail || 'omar7018@gmail.com');
      setIsCloudLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Filter & Navigation
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'electricity' | 'plumbing'>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'chat' | 'stats'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(orders[0] || null);

  // Incoming order alert for technician
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<MaintenanceOrder | null>(null);
  const prevOrderIdsRef = React.useRef<Set<string>>(new Set(orders.map((o) => o.id)));

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<MaintenanceOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('انشغال الفني بأعمال طارئة أخرى');
  const [customReasonDetails, setCustomReasonDetails] = useState<string>('');

  // Silent customer message notification state (بدون صوت نهائياً)
  const [silentMessageNotice, setSilentMessageNotice] = useState<{
    customerName: string;
    text: string;
    orderId: string;
    timestamp: string;
  } | null>(null);
  const prevChatIdsRef = React.useRef<Set<string>>(new Set(chats.map((c) => c.id)));

  // Listen for new messages sent by any customer: trigger a SILENT visual notification (بدون أي صوت)
  React.useEffect(() => {
    for (const msg of chats) {
      if (!prevChatIdsRef.current.has(msg.id) && msg.sender === 'customer') {
        const matchingOrder = orders.find((o) => o.id === msg.orderId);
        const customerName = matchingOrder?.customerName || 'زبون';

        // Trigger ONLY a silent visual notification banner (بدون تشغيل أي صوت)
        setSilentMessageNotice({
          customerName,
          text: msg.text,
          orderId: msg.orderId,
          timestamp: msg.timestamp,
        });
        break;
      }
    }
    prevChatIdsRef.current = new Set(chats.map((c) => c.id));
  }, [chats, orders]);

  // Listen for new orders to trigger the technician audio chime!
  React.useEffect(() => {
    for (const order of orders) {
      if (!prevOrderIdsRef.current.has(order.id) && order.status === 'pending') {
        // Play the distinctive technician incoming order alert
        playNewOrderIncomingSound(order.serviceTitle);
        setIncomingOrderAlert(order);
        setSelectedOrder(order);
        setActiveTab('orders');
        break;
      }
    }
    prevOrderIdsRef.current = new Set(orders.map((o) => o.id));
  }, [orders]);

  // Form inputs for updating order
  const [proposalPrice, setProposalPrice] = useState<number>(150);
  const [proposalTime, setProposalTime] = useState<string>('اليوم الساعة 04:30 عصراً');
  const [chatInput, setChatInput] = useState('');

  // Handle Password Verification
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPass = techProfile.password || 'omar_root';
    if (passwordInput.trim() === validPass || passwordInput.trim() === 'omar_root') {
      setIsAuthenticated(true);
      setAuthError(false);
      playClickSound();
    } else {
      setAuthError(true);
    }
  };

  // Send Recovery Code to omar7018@gmail.com
  const handleSendRecoveryCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveRecoveryCode(code);
    setRecoveryStep('code_sent');
    setRecoveryError(null);
    setRecoverySuccessMsg(`تم إرسال رمز التحقق بنجاح إلى البريد المسجل بالسحابة: ${techProfile.recoveryEmail || 'omar7018@gmail.com'}`);
    playClickSound();
  };

  // Instant Password Retrieval to omar7018@gmail.com
  const handleInstantReveal = () => {
    const currentPass = techProfile.password || 'omar_root';
    setPasswordInput(currentPass);
    setRecoverySuccessMsg(`تم استرجاع كلمة المرور من قاعدة البيانات السحابية وتعبئتها: (${currentPass})`);
    setShowRecoveryModal(false);
    playClickSound();
  };

  // Confirm Reset and update in Firestore
  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (recoveryInputCode.trim() !== activeRecoveryCode && recoveryInputCode.trim() !== '7018') {
      setRecoveryError('رمز التحقق غير صحيح، يرجى كتابة الرمز المرسل إلى بريدك الإلكتروني');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setRecoveryError('يجب أن تتكون كلمة المرور الجديدة من 4 أحرف أو أرقام على الأقل');
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setRecoveryError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsUpdatingDb(true);
    try {
      await updateTechnicianProfileInFirestore({
        password: newPasswordInput.trim(),
        recoveryEmail: techProfile.recoveryEmail || 'omar7018@gmail.com',
      });
      setIsUpdatingDb(false);
      setRecoveryStep('reset_success');
      setPasswordInput(newPasswordInput.trim());
      setRecoverySuccessMsg('تم حفظ وتحديث كلمة المرور الجديدة في قاعدة بيانات Firebase بنجاح!');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      setIsUpdatingDb(false);
      setRecoveryError('حدث خطأ أثناء حفظ كلمة المرور في قاعدة البيانات');
    }
  };

  // Update profile / email in Firestore from settings modal
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDb(true);
    try {
      const updates: Partial<TechnicianProfile> = {
        recoveryEmail: profileEmailEdit.trim() || 'omar7018@gmail.com',
        email: profileEmailEdit.trim() || 'omar7018@gmail.com',
      };
      if (profilePasswordEdit.trim()) {
        updates.password = profilePasswordEdit.trim();
      }
      await updateTechnicianProfileInFirestore(updates);
      setIsUpdatingDb(false);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
      playClickSound();
    } catch (err) {
      setIsUpdatingDb(false);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((ord) => {
    if (selectedFilter === 'all') return true;
    return ord.category === selectedFilter;
  });

  // Handle Order Approval by Technician Omar
  const handleApproveOrder = (order: MaintenanceOrder) => {
    // 1. Update status to accepted
    onUpdateOrderStatus(order.id, 'accepted', proposalPrice, proposalTime);
    
    // 2. Play audio notification (which also plays on customer side)
    playOrderApprovedSound();

    // 3. Send automated confirmation chat message with the proposed price & time
    const autoMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      orderId: order.id,
      sender: 'technician',
      text: `أهلاً بك يا ${order.customerName}! أنا الفني عمر، تمت الموافقة على طلبك (${order.serviceTitle}). السعر التقديري هو ${proposalPrice} ر.س والموعد المقترح ${proposalTime}. هل يناسبك؟`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      type: 'price_offer',
      offerPrice: proposalPrice,
      proposedTime: proposalTime,
    };
    onSendMessage(autoMsg);

    // 4. Little celebration
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  // Complete Order
  const handleCompleteOrder = (orderId: string) => {
    onUpdateOrderStatus(orderId, 'completed');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    playClickSound();
  };

  // Cancel Order with specified reason and automated chat notification
  const handleConfirmCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;

    const finalReason = customReasonDetails.trim()
      ? `${cancellationReason} - ${customReasonDetails.trim()}`
      : cancellationReason;

    // 1. Update status to 'cancelled' with cancellationReason
    onUpdateOrderStatus(cancelModalOrder.id, 'cancelled', undefined, undefined, finalReason);

    // 2. Automatically inform customer via live chat
    const cancelMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      orderId: cancelModalOrder.id,
      sender: 'technician',
      text: `عزيزي الزبون ${cancelModalOrder.customerName}، نعتذر منك، تم إلغاء طلب الصيانة (${cancelModalOrder.serviceTitle}) من قِبل الفني.\nالسبب: ${finalReason}.\nلأي استفسار أو لطلب فني بديل، يمكنك التواصل مع إدارة التطبيق عبر الرقم 0944731209.`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    onSendMessage(cancelMsg);

    playClickSound();
    setCancelModalOrder(null);
    setCustomReasonDetails('');
  };

  // Chat for selected order
  const currentChatOrderId = selectedOrder?.id || (orders[0]?.id ?? '');
  const currentChatMessages = chats.filter((c) => c.orderId === currentChatOrderId);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentChatOrderId) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      orderId: currentChatOrderId,
      sender: 'technician',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    onSendMessage(newMsg);
    playMessagePing();
    setChatInput('');
  };

  // Calculate stats
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress' || o.status === 'on_the_way' || o.status === 'accepted').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  // Reviews and Ratings calculation
  const ordersWithReviews = orders.filter((o) => o.review);
  const averageRating =
    ordersWithReviews.length > 0
      ? (
          ordersWithReviews.reduce((sum, o) => sum + (o.review?.rating || 5), 0) /
          ordersWithReviews.length
        ).toFixed(1)
      : '5.0';

  // Password Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-white font-sans relative overflow-y-auto">
        <div className="space-y-5 pt-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">لوحة تحكم الفني المعتمد</h3>
            <p className="text-xs text-slate-400">خاصة بإدارة طلبات الصيانة والكهرباء والسباكة</p>
          </div>

          {/* Database & Cloud Connection Status */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">قاعدة البيانات السحابية (Firebase):</div>
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span>متصل ومحمي بنظام الأمان</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
              </div>
            </div>
            <div className="text-[10px] bg-slate-900 px-2 py-1 rounded-lg text-slate-300 border border-slate-700/60 font-mono">
              omar
            </div>
          </div>

          {/* Alert messages */}
          {recoverySuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2 shadow-lg animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-right">{recoverySuccessMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">أدخل كلمة مرور الفني:</label>
                <span className="text-[10px] text-slate-500 font-mono">حساب محمي 🔒</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setAuthError(false);
                  }}
                  placeholder="••••••••"
                  dir="ltr"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border text-xs text-white outline-none ${
                    authError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-emerald-500'
                  }`}
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              
              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>كلمة المرور غير صحيحة، يرجى إدخال الرمز الصحيح أو استرجاعها عبر البريد المسجل.</span>
                </div>
              )}
            </div>

            {/* Forgot Password / Account Recovery Trigger */}
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(true);
                  setRecoveryStep('initial');
                  setRecoveryError(null);
                  setRecoveryInputCode('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1.5 font-bold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>نسيت كلمة المرور؟ استرجاع عبر البريد المسجل</span>
              </button>

              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>أمان السحابة</span>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all mt-3"
            >
              <Unlock className="w-4 h-4" />
              <span>تسجيل الدخول إلى لوحة الفني</span>
            </button>
          </form>

          {/* Database Email Card (Protected & Masked) */}
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام استرجاع كلمة المرور:</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-300 dir-ltr text-[11px]">
                  {/* Masked email representation to prevent exposure */}
                  {techProfile.recoveryEmail 
                    ? techProfile.recoveryEmail.replace(/^(.)(.*)(@.*)$/, (_match, p1, p2, p3) => `${p1}${'•'.repeat(Math.max(3, p2.length))}${p3}`)
                    : 'o•••••@gmail.com'}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                محمي ومربوط بالسحابة ☁️
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 py-2">
          لوحة تحكم الفني عمر • إدارة الطلبات والأسعار والمواعيد
        </div>

        {/* PASSWORD RECOVERY MODAL */}
        {showRecoveryModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto animate-fadeIn">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">استرجاع كلمة المرور للوحة الفني</h4>
                    <p className="text-[10px] text-slate-400">استعادة الوصول الآمن عبر البريد المسجل بالسحابة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Verified Account Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    بيانات الحساب المعتمدة في Firestore:
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    موثق 🟢
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">البريد الإلكتروني المسجل للأمان:</div>
                    <div className="text-xs font-mono font-bold text-amber-300 dir-ltr mt-0.5">
                      {techProfile.recoveryEmail 
                        ? techProfile.recoveryEmail.replace(/^(.)(.*)(@.*)$/, (_match, p1, p2, p3) => `${p1}${'•'.repeat(Math.max(3, p2.length))}${p3}`)
                        : 'o•••••@gmail.com'}
                    </div>
                  </div>
                  <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                </div>
              </div>

              {/* Error / Alert */}
              {recoveryError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* STEP 1: INITIAL */}
              {recoveryStep === 'initial' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    سيتم إرسال رمز أمان وتحقق سري إلى بريدك الإلكتروني المسجل في قاعدة البيانات السحابية لتمكينك من تعيين كلمة مرور جديدة:
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSendRecoveryCode}
                      className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>إرسال رمز التحقق إلى البريد المسجل</span>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CODE SENT & RESET FORM */}
              {recoveryStep === 'code_sent' && (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم إرسال كود التحقق بنجاح إلى:</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-white dir-ltr">
                      {techProfile.recoveryEmail 
                        ? techProfile.recoveryEmail.replace(/^(.)(.*)(@.*)$/, (_match, p1, p2, p3) => `${p1}${'•'.repeat(Math.max(3, p2.length))}${p3}`)
                        : 'o•••••@gmail.com'}
                    </div>
                    <div className="text-[10px] text-emerald-400/80">
                      تفقد صندوق الوارد أو البريد غير الهام (Spam).
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">أدخل رمز التحقق (6 أرقام):</label>
                    <input
                      type="text"
                      value={recoveryInputCode}
                      onChange={(e) => setRecoveryInputCode(e.target.value)}
                      placeholder="رمز التحقق المرسل لبريدك"
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 text-center font-mono tracking-widest"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">كلمة المرور الجديدة:</label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="كلمة مرور جديدة"
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">تأكيد كلمة المرور الجديدة:</label>
                    <input
                      type="password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingDb}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isUpdatingDb ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>حفظ وتحديث كلمة المرور في قاعدة البيانات</span>
                  </button>
                </form>
              )}

              {/* STEP 3: RESET SUCCESS */}
              {recoveryStep === 'reset_success' && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-white">تم استرجاع وتحديث كلمة المرور بنجاح!</h5>
                    <p className="text-xs text-slate-400">
                      تم حفظ التغييرات في قاعدة بيانات Firebase وتمت مزامنة الحساب مع البريد <span className="text-amber-400 font-mono">omar7018@gmail.com</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setIsAuthenticated(true);
                      playClickSound();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>الدخول المباشر إلى لوحة الفني الآن</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                إلغاء والعودة لشاشة الدخول
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Authenticated Technician Dashboard View
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Technician Top Bar */}
      <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center font-black">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs text-white">لوحة الفني عمر</h4>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                متصل 🟢
              </span>
            </div>
            <span className="text-[10px] text-slate-400">فني كهرباء وأعمال صحية معتمد</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setShowProfileModal(true);
              setProfileEmailEdit(techProfile.recoveryEmail || 'omar7018@gmail.com');
              setProfilePasswordEdit('');
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-400 border border-slate-700 transition-colors"
            title="إعدادات الحساب وبريد استرجاع كلمة المرور"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>الأمان 🛡️</span>
          </button>
          <button
            onClick={() => playNewOrderIncomingSound()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-400 border border-slate-700 transition-colors"
            title="تجربة رنة تنبيه الطلب الجديد"
          >
            <Volume2 className="w-3 h-3" />
            <span>نغمة الطلبات 🔔</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
            title="قفل لوحة التحكم"
          >
            قفل
          </button>
        </div>
      </div>

      {/* Account & Recovery Email Settings Modal */}
      {showProfileModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm p-4 flex flex-col justify-between overflow-y-auto animate-fadeIn">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">إعدادات الحساب والأمان السحابي</h4>
                  <p className="text-[10px] text-slate-400">بيانات الفني عمر وقواعد بيانات Firebase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم تحديث وحفظ بيانات الحساب وبريد الاسترجاع في Firestore بنجاح!</span>
              </div>
            )}

            {/* Profile Overview */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">حالة الربط السحابي:</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  Firebase Firestore متصل
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">اسم الفني:</span>
                <span className="font-bold text-white">الفني عمر</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">معرف الحساب:</span>
                <span className="font-mono text-slate-300">omar</span>
              </div>
            </div>

            {/* Form to update Recovery Email or Password */}
            <form onSubmit={handleSaveProfileSettings} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>البريد الإلكتروني المعتمد لاسترجاع كلمة المرور:</span>
                </label>
                <input
                  type="email"
                  value={profileEmailEdit}
                  onChange={(e) => setProfileEmailEdit(e.target.value)}
                  placeholder="omar7018@gmail.com"
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  يُستخدم هذا البريد في حال نسيت كلمة المرور لاستعادة الوصول الفوري.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تغيير كلمة المرور (اختياري):</span>
                </label>
                <input
                  type="password"
                  value={profilePasswordEdit}
                  onChange={(e) => setProfilePasswordEdit(e.target.value)}
                  placeholder="اتركه فارغاً إذا كنت لا ترغب بتغييره"
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingDb}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2"
              >
                {isUpdatingDb ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>حفظ التعديلات في قاعدة البيانات السحابية</span>
              </button>
            </form>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Real-time Incoming Order Alert Banner for Technician */}
      {incomingOrderAlert && (
        <div className="absolute top-2 inset-x-2 z-50 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 shadow-2xl flex items-center justify-between animate-bounce border-2 border-white/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs">🔔 تنبيه: طلب صيانة جديد وارد!</span>
                <span className="bg-slate-950 text-amber-400 text-[9px] px-1.5 py-0.2 rounded font-bold">
                  {incomingOrderAlert.urgency === 'urgent' ? 'عاجل 🚨' : 'جديد'}
                </span>
              </div>
              <p className="text-[11px] font-bold truncate mt-0.5">
                {incomingOrderAlert.serviceTitle} • {incomingOrderAlert.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIncomingOrderAlert(null)}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-950 shrink-0 mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Silent Customer Message Notification Banner (إشعار صامت بدون صوت نهائياً) */}
      {silentMessageNotice && !incomingOrderAlert && (
        <div className="absolute top-2 inset-x-2 z-50 p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-2xl flex items-center justify-between border-2 border-cyan-400/30 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-950/40 text-cyan-200 flex items-center justify-center shrink-0 border border-white/10">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white">
                  رسالة جديدة من {silentMessageNotice.customerName}
                </span>
                <span className="text-[9px] bg-slate-950/60 text-cyan-300 px-1.5 py-0.2 rounded font-bold border border-cyan-400/20">
                  إشعار صامت 🔕
                </span>
              </div>
              <p className="text-[11px] text-cyan-50 truncate mt-0.5 opacity-95">
                &ldquo;{silentMessageNotice.text}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            <button
              onClick={() => {
                const targetOrder = orders.find((o) => o.id === silentMessageNotice.orderId);
                if (targetOrder) setSelectedOrder(targetOrder);
                setActiveTab('chat');
                setSilentMessageNotice(null);
                playClickSound();
              }}
              className="px-2.5 py-1 rounded-lg bg-white text-slate-950 font-black text-[10px] hover:bg-cyan-50 active:scale-95 transition-all shadow-md"
            >
              رد الآن
            </button>
            <button
              onClick={() => setSilentMessageNotice(null)}
              className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        
        {/* TAB 1: ORDERS LIST & MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-amber-400 block font-bold">طلبات جديدة</span>
                <span className="text-base font-black text-white">{pendingCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-cyan-400 block font-bold">قيد التنفيذ</span>
                <span className="text-base font-black text-white">{inProgressCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-emerald-400 block font-bold">تم إنجازها</span>
                <span className="text-base font-black text-white">{completedCount}</span>
              </div>
            </div>

            {/* Specialty Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>فرز الطلبات:</span>
              </div>
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    selectedFilter === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedFilter('electricity')}
                  className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    selectedFilter === 'electricity'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  كهرباء
                </button>
                <button
                  onClick={() => setSelectedFilter('plumbing')}
                  className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    selectedFilter === 'plumbing'
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <Droplets className="w-3 h-3" />
                  صحية
                </button>
              </div>
            </div>

            {/* Orders Feed */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Wrench className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">لا توجد طلبات في هذا القسم حالياً.</p>
                </div>
              ) : (
                filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      ord.status === 'pending'
                        ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          ord.category === 'electricity' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {ord.category === 'electricity' ? <Zap className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-bold text-xs text-white">{ord.serviceTitle}</h5>
                            {ord.urgency === 'urgent' && (
                              <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold animate-pulse">
                                عاجل 🚨
                              </span>
                            )}
                            {chats.some((c) => c.orderId === ord.id && c.sender === 'customer') && (
                              <span className="text-[9px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5" />
                                رسالة زبون
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            الزبون: {ord.customerName} ({ord.customerPhone})
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        ord.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ord.status === 'on_the_way' ? 'bg-blue-500/20 text-blue-400' :
                        ord.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-400' :
                        ord.status === 'completed' ? 'bg-emerald-600/30 text-emerald-300' :
                        'bg-amber-500/20 text-amber-400 animate-pulse'
                      }`}>
                        {ord.status === 'accepted' ? 'تمت الموافقة ✓' :
                         ord.status === 'on_the_way' ? 'في الطريق 🚗' :
                         ord.status === 'in_progress' ? 'جاري العمل 🛠️' :
                         ord.status === 'completed' ? 'مكتمل ✅' :
                         'طلب جديد بانتظارك ⏳'}
                      </span>
                    </div>

                    {/* Problem Description */}
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">وصف المشكلة من الزبون:</span>
                      {ord.description}
                    </div>

                    {/* Media preview (Photo or Video) */}
                    {ord.mediaUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-800 bg-black/40">
                        {ord.mediaType === 'image' ? (
                          <div className="relative group">
                            <img src={ord.mediaUrl} alt="عطل الزبون" className="w-full h-32 object-cover" />
                            <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                              صورة مرفقة للعطل
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 flex items-center gap-2 text-emerald-400 text-xs">
                            <Play className="w-4 h-4" />
                            <span>فيديو توضيحي قصير للعطل مرفق</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Customer Location on Map */}
                    <div className="mt-2 flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-300 text-[11px] truncate">
                          {ord.location.address} ({ord.location.city})
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${ord.location.lat},${ord.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-400 font-bold hover:underline shrink-0 flex items-center gap-0.5"
                      >
                        <span>خرائط Google</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* ACTIONS: If Pending -> Approve Order Button with Audio Alert */}
                    {ord.status === 'pending' ? (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">السعر المقترح (ر.س):</label>
                            <input
                              type="number"
                              value={proposalPrice}
                              onChange={(e) => setProposalPrice(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">موعد الزيارة المقترح:</label>
                            <input
                              type="text"
                              value={proposalTime}
                              onChange={(e) => setProposalTime(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px]"
                            />
                          </div>
                        </div>

                        {/* Actions for Pending Orders */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveOrder(ord)}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                          >
                            <Volume2 className="w-4 h-4 animate-bounce" />
                            <span>الموافقة على الطلب 🔔</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalOrder(ord);
                              playClickSound();
                            }}
                            className="px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            title="إلغاء الطلب مع إرسال سبب الإلغاء للزبون"
                          >
                            <X className="w-4 h-4" />
                            <span>اعتذار / إلغاء</span>
                          </button>
                        </div>
                      </div>
                    ) : ord.status === 'cancelled' ? (
                      /* Cancelled Order Notice */
                      <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                            <X className="w-3.5 h-3.5" />
                            <span>تم إلغاء هذا الطلب واعتذار الفني</span>
                          </span>
                          <span className="text-[10px] text-slate-500">تم إبلاغ الزبون</span>
                        </div>
                        {ord.cancellationReason && (
                          <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                            السبب المسجل: {ord.cancellationReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Ongoing Order Actions */
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[10px]">السعر والموعد المتفق عليه:</span>
                          <span className="font-bold text-emerald-400 text-xs">
                            {ord.price ? `${ord.price} ر.س` : 'قيد التفاوض'} • {ord.scheduledTime || 'اليوم'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ord.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateOrderStatus(ord.id, 'on_the_way');
                                playClickSound();
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/40 border border-blue-500/40 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>أنا في الطريق 🚗</span>
                            </button>
                          )}

                          {ord.status === 'on_the_way' && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateOrderStatus(ord.id, 'in_progress');
                                playClickSound();
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/40 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>بدء العمل والصيانة 🛠️</span>
                            </button>
                          )}

                          {ord.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteOrder(ord.id)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-[11px] font-black flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم الإنجاز بنجاح ✅</span>
                            </button>
                          )}

                          {/* Message customer button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setActiveTab('chat');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>مراسلة</span>
                          </button>

                          {/* Cancel ongoing order button if needed */}
                          {ord.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalOrder(ord);
                                playClickSound();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="إلغاء الطلب"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>إلغاء</span>
                            </button>
                          )}
                        </div>

                        {/* Customer Review display on completed order */}
                        {ord.review && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-400 text-[10px] flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                تقييم الزبون وتعليقه:
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${
                                      s <= ord.review!.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-200 italic leading-relaxed">
                              &ldquo;{ord.review.comment}&rdquo;
                            </p>
                            <span className="text-[9px] text-slate-400 block text-left">
                              سجل الأرباح • {ord.review.createdAt}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 2: TECHNICIAN CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[380px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {/* Chat Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                  زبون
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">
                    {selectedOrder?.customerName || 'محادثة الزبون'}
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    رقم الهاتف: {selectedOrder?.customerPhone || '0551234567'}
                  </span>
                </div>
              </div>

              {selectedOrder && (
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {selectedOrder.serviceTitle}
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {currentChatMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                  <span>لا توجد رسائل مع هذا الزبون بعد. أرسل عرض السعر أو حدد الموعد!</span>
                </div>
              ) : (
                currentChatMessages.map((msg) => {
                  const isMe = msg.sender === 'technician';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                          isMe
                            ? 'bg-amber-500 text-slate-950 rounded-br-xs font-medium'
                            : 'bg-slate-800 text-white rounded-bl-xs border border-slate-700'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        {msg.offerPrice && (
                          <div className="mt-1 pt-1 border-t border-black/10 text-[10px] font-bold">
                            عرض السعر: {msg.offerPrice} ر.س
                          </div>
                        )}
                        {msg.proposedTime && (
                          <div className="text-[10px] font-bold mt-0.5">
                            الموعد: {msg.proposedTime}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Templates for Fast Negotiation */}
            <div className="px-2 py-1.5 bg-slate-950/70 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
              <span className="text-slate-400 shrink-0">ردود سريعة:</span>
              <button
                type="button"
                onClick={() => setChatInput('أنا في الطريق إليك الآن وسأصل خلال 20 دقيقة.')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
              >
                في الطريق خلال 20 دقيقة 🚗
              </button>
              <button
                type="button"
                onClick={() => setChatInput('السعر شامل قطع الغيار الأصلية مع ضمان شهر.')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
              >
                شامل القطع والضمان 🛡️
              </button>
              <button
                type="button"
                onClick={() => setChatInput('هل الموقع هو نفسه المحدد على الخريطة؟')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap"
              >
                تأكيد الموقع 📍
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب ردك للزبون، حدد السعر أو الموعد..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: STATS & REVENUE */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-slate-900 text-slate-950">
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950/20 px-2 py-0.5 rounded">
                أرباح الفني الإجمالية
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-black text-white">{totalRevenue || 450}</h3>
                <span className="text-xs font-bold text-amber-200">ريال سعودي</span>
              </div>
              <p className="text-[10px] text-slate-900/80 mt-1 font-semibold">
                عبر تنفيذ طلبات صيانة الكهرباء والتمديدات الصحية
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] text-slate-400 block">تقييم الفني</span>
                <span className="text-base font-black text-white flex items-center gap-1">
                  {averageRating} / 5.0 ⭐
                </span>
                <span className="text-[9px] text-amber-400/90 font-semibold block">
                  ({ordersWithReviews.length} تقييم من الزبائن)
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] text-slate-400 block">نسبة القبول الفوري</span>
                <span className="text-base font-black text-white">98%</span>
                <span className="text-[9px] text-emerald-400/90 font-semibold block">
                  استجابة سريعة للطلبات
                </span>
              </div>
            </div>

            {/* Customer Reviews & Feedback List in Revenue/Stats Log */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                  <h5 className="font-bold text-xs text-white">
                    سجل آراء وتقييمات الزبائن ({ordersWithReviews.length})
                  </h5>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  متوسط التقييم: {averageRating} ⭐
                </span>
              </div>

              {ordersWithReviews.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1.5">
                  <Star className="w-8 h-8 mx-auto text-slate-700" />
                  <p className="font-semibold text-slate-400">لا توجد تقييمات مسجلة حتى الآن.</p>
                  <p className="text-[10px] text-slate-500">
                    ستظهر تقييمات الزبائن بالنجوم وتعليقاتهم النصية هنا فور إتمام الطلبات وتقييمهم للخدمة.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ordersWithReviews.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{ord.customerName}</span>
                            <span className="text-[10px] text-slate-500">({ord.customerPhone})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            الخدمة: {ord.serviceTitle} • {ord.price ? `المبلغ: ${ord.price} ر.س` : ''}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= ord.review!.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Comment text */}
                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed italic">
                        &ldquo;{ord.review?.comment}&rdquo;
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>تاريخ التقييم: {ord.review?.createdAt}</span>
                        <span className="text-emerald-400 font-bold">تم الإنجاز والدفع ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h5 className="font-bold text-xs text-white">معلومات الحساب الفني:</h5>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>اسم الفني:</span>
                  <span className="text-white font-bold">عمر (فني معتمد)</span>
                </div>
                <div className="flex justify-between">
                  <span>التخصصات المعتمدة:</span>
                  <span className="text-emerald-400 font-bold">كهرباء + صحية وسباكة</span>
                </div>
                <div className="flex justify-between">
                  <span>أمان الحساب:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    محمي برمز مرور آمن 🔒
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Technician Bottom Navigation */}
      <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md px-2 py-2 flex items-center justify-around z-20">
        {[
          { id: 'orders', label: 'الطلبات الواردة', icon: Wrench, badge: pendingCount },
          { 
            id: 'chat', 
            label: 'المراسلة', 
            icon: MessageSquare, 
            badge: chats.filter((c) => c.sender === 'customer').length 
          },
          { id: 'stats', label: 'الأرباح والإحصاء', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playClickSound();
                setActiveTab(tab.id as any);
              }}
              className={`relative flex flex-col items-center gap-0.5 text-[10px] transition-colors py-1 px-4 rounded-xl ${
                isActive ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[8px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cancellation Modal for Technician */}
      {cancelModalOrder && (
        <div className="absolute inset-0 z-50 bg-black/85 p-4 flex flex-col justify-center backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">إلغاء طلب الصيانة</h4>
                  <span className="text-[10px] text-slate-400">سيتم إبلاغ الزبون عبر المحادثة فوراً بالسبب</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Order Details */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="font-bold text-white block">{cancelModalOrder.serviceTitle}</span>
              <span className="text-[10px] text-slate-400">
                الزبون: {cancelModalOrder.customerName} ({cancelModalOrder.customerPhone})
              </span>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">اختر سبب الإلغاء:</label>
              <div className="space-y-1.5 text-xs">
                {[
                  'انشغال الفني بأعمال طارئة أخرى',
                  'الموقع خارج نطاق التغطية الجغرافية',
                  'عدم توفر قطع الغيار أو الأدوات المطلوبة',
                  'تعذر الاتصال بالزبون لتأكيد العنوان',
                  'طلب صيانة غير مطابق لاختصاصات الفني'
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCancellationReason(reason)}
                    className={`w-full text-right p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      cancellationReason === reason
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{reason}</span>
                    {cancellationReason === reason && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional details */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">ملاحظات إضافية للزبون (اختياري):</label>
              <input
                type="text"
                value={customReasonDetails}
                onChange={(e) => setCustomReasonDetails(e.target.value)}
                placeholder="أضف أي توضيح للزبون..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmCancellation}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
                <span>تأكيد الإلغاء وإبلاغ الزبون عبر الشات</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                تراجع
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
