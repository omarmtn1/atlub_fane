import React, { useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  PlusCircle,
  Clock,
  MapPin,
  Camera,
  Video,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  ChevronLeft,
  X,
  Volume2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Star,
  Eye,
  LogIn,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MaintenanceOrder, ChatMessage, LocationInfo, ServiceCategory, UrgencyLevel, OrderReview } from '../types';
import { MapPicker } from './MapPicker';
import { playOrderApprovedSound, playMessagePing, playClickSound } from '../utils/audio';

interface CustomerAppProps {
  orders: MaintenanceOrder[];
  chats: ChatMessage[];
  onAddOrder: (newOrder: MaintenanceOrder) => void;
  onSendMessage: (msg: ChatMessage) => void;
  onReviewOrder: (orderId: string, rating: number, comment: string) => void;
  onSelectOrderChat?: (orderId: string) => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  orders,
  chats,
  onAddOrder,
  onSendMessage,
  onReviewOrder,
}) => {
  // Authentication State (Mobile number & Auto-verification)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuestPreview, setIsGuestPreview] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('09');
  const [userName, setUserName] = useState('');
  const [authStep, setAuthStep] = useState<'input_phone' | 'verifying' | 'authenticated'>('input_phone');
  const [otpCode, setOtpCode] = useState('');
  const [verificationCountdown, setVerificationCountdown] = useState(3);
  const [showQuickAuthModal, setShowQuickAuthModal] = useState(false);

  // App Navigation inside Customer Phone
  const [activeTab, setActiveTab] = useState<'home' | 'new_order' | 'my_orders' | 'chat'>('home');
  const [selectedOrderIdForChat, setSelectedOrderIdForChat] = useState<string | null>(null);

  // Rating State Modal
  const [ratingModalOrderId, setRatingModalOrderId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');

  // New Order Form State
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('electricity');
  const [serviceSubTitle, setServiceSubTitle] = useState('صيانة قواطع كهربائية وإنارة');
  const [problemDescription, setProblemDescription] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [mediaFile, setMediaFile] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [location, setLocation] = useState<LocationInfo>({
    lat: 24.7136,
    lng: 46.6753,
    address: 'شارع التخصصي، حي العليا',
    city: 'الرياض',
  });

  // Chat input
  const [chatInput, setChatInput] = useState('');

  // Audio approval banner alert
  const [approvalAlert, setApprovalAlert] = useState<{ orderTitle: string; price?: number } | null>(null);

  // Watch for order approval to trigger audio chime
  const previousStatusMap = React.useRef<{ [id: string]: string }>({});

  useEffect(() => {
    orders.forEach((order) => {
      const prev = previousStatusMap.current[order.id];
      if (prev && prev !== 'accepted' && order.status === 'accepted') {
        // Trigger audio notification!
        playOrderApprovedSound();
        setApprovalAlert({
          orderTitle: order.serviceTitle,
          price: order.price,
        });
      }
      previousStatusMap.current[order.id] = order.status;
    });
  }, [orders]);

  // Handle Automatic OTP Verification Flow
  const handleStartLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setAuthStep('verifying');
    setVerificationCountdown(3);

    // Auto verify countdown simulation
    const timer = setInterval(() => {
      setVerificationCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setOtpCode('8492');
          setTimeout(() => {
            setAuthStep('authenticated');
            setIsLoggedIn(true);
            setIsGuestPreview(false);
            playClickSound();
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Sample media presets to easily attach realistic photos/videos
  const handlePresetMedia = (type: 'image' | 'video', url: string) => {
    setMediaFile({ url, type });
  };

  // Dispatch final order
  const dispatchOrder = () => {
    const newOrder: MaintenanceOrder = {
      id: `ord-${Date.now()}`,
      customerName: userName || 'زبون تطبيق اطلب فني',
      customerPhone: phoneNumber,
      category: serviceCategory,
      serviceTitle: serviceSubTitle,
      description: problemDescription,
      urgency,
      location,
      mediaUrl: mediaFile?.url,
      mediaType: mediaFile?.type,
      status: 'pending',
      createdAt: 'الآن',
    };

    onAddOrder(newOrder);
    playClickSound();
    // Reset form
    setProblemDescription('');
    setMediaFile(null);
    setActiveTab('my_orders');
    setShowQuickAuthModal(false);
  };

  // Submit Order (checks for guest preview)
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) {
      alert('يرجى كتابة شرح مختصر للمشكلة أو العطل');
      return;
    }

    // If currently exploring as a guest, prompt to verify phone to send the order to the technician
    if (!isLoggedIn) {
      setShowQuickAuthModal(true);
      return;
    }

    dispatchOrder();
  };

  const openRatingModal = (orderId: string) => {
    setRatingModalOrderId(orderId);
    setRatingStars(5);
    setRatingComment('');
    playClickSound();
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModalOrderId) return;
    onReviewOrder(
      ratingModalOrderId,
      ratingStars,
      ratingComment.trim() || 'فني ممتاز ومحترف، أنجز العمل بإتقان وسرعة وعلى الموعد.'
    );
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
    playClickSound();
    setRatingModalOrderId(null);
  };

  // Chat for selected order or general chat
  const currentChatOrderId = selectedOrderIdForChat || (orders[0]?.id ?? 'default');
  const currentOrderChatMessages = chats.filter((c) => c.orderId === currentChatOrderId);
  const activeOrderObj = orders.find((o) => o.id === currentChatOrderId) || orders[0];

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      orderId: currentChatOrderId,
      sender: 'customer',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    onSendMessage(newMsg);
    playMessagePing();
    setChatInput('');
  };

  // Login Screen if not authenticated AND not in guest preview
  if (!isLoggedIn && !isGuestPreview) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-white font-sans overflow-y-auto">
        <div className="space-y-6 pt-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/30">
              <Zap className="w-8 h-8 fill-slate-950" />
            </div>
            <h3 className="text-xl font-black text-white">تطبيق اطلب فني</h3>
            <p className="text-xs text-slate-400">صيانة وتمديدات الكهرباء والصحية عند باب منزلك</p>
          </div>

          {authStep === 'input_phone' ? (
            <form onSubmit={handleStartLogin} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الاسم الكامل:</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">رقم الموبايل:</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09XXXXXXXX"
                    required
                    dir="ltr"
                    className="w-full text-right px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 pt-1">
                  <Sparkles className="w-3 h-3" />
                  ميزة التفعيل التلقائي الفوري عبر رسالة التحقق
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-4"
              >
                <span>دخول وتفعيل الحساب تلقائياً</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Explicit Option to Preview the App without registration */}
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-700/80"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold">أو استكشف واجهة التطبيق</span>
                  <div className="flex-grow border-t border-slate-700/80"></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsGuestPreview(true);
                    playClickSound();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md group"
                >
                  <Eye className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>معاينة واجهة وتجربة التطبيق (كزائر)</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-4 mt-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">جاري التفعيل التلقائي برقمك</h4>
                <p className="text-xs text-slate-400 mt-1" dir="ltr">{phoneNumber}</p>
              </div>

              <div className="py-2">
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 font-mono text-base font-bold tracking-widest">
                  {otpCode || `جاري القراءة تلقائياً... (${verificationCountdown} ثوانٍ)`}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                تم استلام كود التفعيل والتحقق أوتوماتيكياً دون الحاجة للإدخال اليدوي!
              </p>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500 py-2">
          تطبيق الزبون المعتمد • تمديدات كهربائية وصحية
        </div>
      </div>
    );
  }

  // Authenticated Main View
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Real-time Order Approval Sound Banner */}
      {approvalAlert && (
        <div className="absolute top-2 inset-x-2 z-50 p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-2xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs">إشعار صوتي: تمت الموافقة!</span>
                <span className="bg-slate-950/20 text-[9px] px-1.5 py-0.2 rounded font-bold">عمر الفني</span>
              </div>
              <p className="text-[11px] font-medium leading-tight opacity-95">
                قبل طلبك: {approvalAlert.orderTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setApprovalAlert(null)}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Guest Preview Notice Bar */}
      {!isLoggedIn && (
        <div className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between text-[11px] sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold min-w-0">
            <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">وضع معاينة التطبيق (كزائر)</span>
          </div>
          <button
            onClick={() => {
              setIsGuestPreview(false);
              setAuthStep('input_phone');
              playClickSound();
            }}
            className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] active:scale-95 transition-all flex items-center gap-1 shrink-0 shadow-sm"
          >
            <LogIn className="w-3 h-3" />
            <span>تسجيل الموبايل</span>
          </button>
        </div>
      )}

      {/* Top Customer Header */}
      <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-[29px] z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
            <Zap className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">اطلب فني (الزبون)</h4>
            <div className="flex items-center gap-1 text-[10px]">
              {isLoggedIn ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 font-medium">مرحباً، {userName.trim() ? userName.split(' ')[0] : 'بالزبون الكريـم'}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="text-amber-300 font-bold">معاينة واجهة التطبيق</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isLoggedIn ? (
            <button
              onClick={() => {
                setIsGuestPreview(false);
                setAuthStep('input_phone');
                playClickSound();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] text-emerald-400 border border-emerald-500/30 font-bold transition-colors"
              title="تسجيل الدخول برقم الموبايل والتفعيل التلقائي"
            >
              <LogIn className="w-3 h-3" />
              <span>دخول</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setIsGuestPreview(true);
                playClickSound();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
              title="العودة لوضع المعاينة كزائر"
            >
              <LogOut className="w-3 h-3" />
              <span>خروج</span>
            </button>
          )}

          <button
            onClick={() => {
              playOrderApprovedSound();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-[10px] text-emerald-400 border border-slate-700 hover:border-emerald-500"
            title="تجربة رنة ونغمة الموافقة الصوتية"
          >
            <Volume2 className="w-3 h-3" />
            <span className="hidden xs:inline">نغمة</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Quick Action Hero Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  فنيون معتمدون متواجدون الآن
                </span>
                <span className="text-[10px] opacity-80">سرعة وصول 20-40 دقيقة</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold">هل لديك عطل كهربائي أو سباكة؟</h3>
                <p className="text-xs text-emerald-100 opacity-90 mt-0.5 leading-relaxed">
                  اطلب فني معتمد بضغطة زر مع تحديد موقعك على الخريطة وإشعار صوتي فوري عند القبول!
                </p>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveTab('new_order');
                }}
                className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>اطلب صيانة الآن (جديد)</span>
              </button>
            </div>

            {/* Choose Specialty Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-300">اختر التخصص المطلوب:</h5>
                <span className="text-[10px] text-slate-500">فني كهرباء وصحية متخصص</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Electricity Card */}
                <div
                  onClick={() => {
                    setServiceCategory('electricity');
                    setServiceSubTitle('أعطال وتمديدات كهربائية');
                    setActiveTab('new_order');
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    serviceCategory === 'electricity'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 fill-amber-400" />
                  </div>
                  <h6 className="font-bold text-xs text-white">تمديدات وتصليحات الكهرباء</h6>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    صيانة قواطع، إنارة، تصليح شورتات كهربائية، تمديدات جدارية وأفياش.
                  </p>
                  <span className="text-[10px] text-amber-400 font-bold block mt-2">اطلب كهربائي ←</span>
                </div>

                {/* Plumbing Card */}
                <div
                  onClick={() => {
                    setServiceCategory('plumbing');
                    setServiceSubTitle('صيانة سباكة وأعمال صحية');
                    setActiveTab('new_order');
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    serviceCategory === 'plumbing'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                    <Droplets className="w-5 h-5 fill-cyan-400" />
                  </div>
                  <h6 className="font-bold text-xs text-white">التمديدات والأعمال الصحية</h6>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    علاج تسريبات المياه، تغيير خلاطات وسيفونات، صيانة مضخات وسخانات.
                  </p>
                  <span className="text-[10px] text-cyan-400 font-bold block mt-2">اطلب سباك ←</span>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-300">طلباتي النشطة ({orders.length})</h5>
                <button
                  onClick={() => setActiveTab('my_orders')}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  عرض الكل
                </button>
              </div>

              {orders.slice(0, 2).map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => {
                    setSelectedOrderIdForChat(ord.id);
                    setActiveTab('my_orders');
                  }}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      ord.category === 'electricity' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {ord.category === 'electricity' ? <Zap className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                    </div>
                    <div>
                      <h6 className="font-bold text-xs text-white">{ord.serviceTitle}</h6>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {ord.location.address}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      ord.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ord.status === 'on_the_way' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ord.status === 'accepted' ? 'تمت الموافقة ✓' :
                       ord.status === 'on_the_way' ? 'في الطريق' :
                       ord.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: NEW ORDER FORM */}
        {activeTab === 'new_order' && (
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                إنشاء طلب صيانة جديد
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>

            {/* Guest Preview Tip in Form */}
            {!isLoggedIn && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px] text-amber-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>معاينة نموذج الطلب: يمكنك تعبئة التفاصيل واختيار الموقع، والتفعيل بنقرة واحدة عند الإرسال.</span>
                </div>
              </div>
            )}

            {/* Service Category Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">القسم والتخصص:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setServiceCategory('electricity');
                    setServiceSubTitle('أعطال وقواطع وتمديد كهربائي');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    serviceCategory === 'electricity'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>كهرباء ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServiceCategory('plumbing');
                    setServiceSubTitle('أعمال صحية وسباكة وتسريبات');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    serviceCategory === 'plumbing'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>صحية وسباكة 🚿</span>
                </button>
              </div>
            </div>

            {/* Sub-Title / Problem Headline */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">عنوان الطلب:</label>
              <input
                type="text"
                value={serviceSubTitle}
                onChange={(e) => setServiceSubTitle(e.target.value)}
                placeholder="مثلاً: صيانة شورت في لوحة القواطع"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">شرح وتفاصيل المشكلة:</label>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="اشرح العطل للفني بدقة (مثال: انقطاع الكهرباء في المطبخ مع رائحة احتراق، أو تسريب مياه تحت مغسلة الحمام الرئيسي)..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none resize-none leading-relaxed"
                required
              />
            </div>

            {/* Urgency selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">مستوى الاستعجال:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    urgency === 'urgent'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>طوارئ عاجل 🚨</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    urgency === 'normal'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>عادي (حسب الموعد)</span>
                </button>
              </div>
            </div>

            {/* Media Attachment (Photo or Short Video) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">إرفاق صورة أو فيديو قصير للعطل:</label>
                {mediaFile && (
                  <button
                    type="button"
                    onClick={() => setMediaFile(null)}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    حذف المرفق
                  </button>
                )}
              </div>

              {mediaFile ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-900 p-2 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {mediaFile.type === 'image' ? (
                      <img src={mediaFile.url} alt="مرفق العطل" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-emerald-400">
                        <Video className="w-6 h-6" />
                        <span className="text-[8px] mt-0.5">فيديو</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="font-bold text-white block">
                      {mediaFile.type === 'image' ? 'تم إرفاق صورة العطل' : 'تم إرفاق فيديو توضيحي قصير'}
                    </span>
                    <span className="text-[10px] text-emerald-400">جاهز للمعاينة من قِبل الفني</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaFile(null)}
                    className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer py-2.5 px-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors">
                      <Camera className="w-4 h-4" />
                      <span className="text-[10px] font-semibold">التقاط / رفع صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setMediaFile({ url, type: 'image' });
                          }
                        }}
                      />
                    </label>

                    <label className="cursor-pointer py-2.5 px-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors">
                      <Video className="w-4 h-4" />
                      <span className="text-[10px] font-semibold">فيديو توضيحي</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setMediaFile({ url, type: 'video' });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Preset quick sample images for rapid testing */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 overflow-x-auto pt-1">
                    <span className="shrink-0">نماذج سريعة:</span>
                    <button
                      type="button"
                      onClick={() => handlePresetMedia('image', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80')}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                    >
                      صورة قاطع كهربائي
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetMedia('image', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80')}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                    >
                      صورة تسريب سباكة
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Location Selector via Map */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">موقعك على الخريطة:</label>
              <div 
                onClick={() => setShowMapModal(true)}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">{location.address}</span>
                    <span className="text-[10px] text-slate-400">{location.city} (انقر للتغيير أو فتح الخريطة)</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">تعديل الخريطة</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all mt-4"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الطلب للفني الآن</span>
            </button>
          </form>
        )}

        {/* TAB 3: MY ORDERS LIST */}
        {activeTab === 'my_orders' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-xs text-white">سجل طلباتي</h4>
              <button
                onClick={() => setActiveTab('new_order')}
                className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                طلب جديد
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">لا توجد طلبات سابقة حتى الآن.</p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    ord.status === 'accepted'
                      ? 'bg-slate-900 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        ord.category === 'electricity' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {ord.category === 'electricity' ? <Zap className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-white">{ord.serviceTitle}</h5>
                        <span className="text-[10px] text-slate-400">{ord.createdAt}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      ord.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ord.status === 'on_the_way' ? 'bg-blue-500/20 text-blue-400' :
                      ord.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-400' :
                      ord.status === 'completed' ? 'bg-emerald-600/30 text-emerald-300' :
                      ord.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ord.status === 'accepted' && <CheckCircle2 className="w-3 h-3" />}
                      {ord.status === 'accepted' ? 'تمت الموافقة من الفني' :
                       ord.status === 'on_the_way' ? 'الفني في الطريق إليك' :
                       ord.status === 'in_progress' ? 'جاري العمل والصيانة' :
                       ord.status === 'completed' ? 'تم الإنجاز بنجاح' :
                       ord.status === 'cancelled' ? 'ملغي ✕' :
                       'قيد الانتظار'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950/40 p-2 rounded-lg">
                    {ord.description}
                  </p>

                  {/* Cancellation notice if cancelled */}
                  {ord.status === 'cancelled' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-rose-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>تم إلغاء هذا الطلب من قِبل الفني</span>
                        </span>
                        <span className="text-[10px] text-slate-500">تم إشعارك بالشات</span>
                      </div>
                      {ord.cancellationReason && (
                        <p className="text-slate-200 text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                          <strong className="text-rose-300">سبب الإلغاء: </strong>
                          {ord.cancellationReason}
                        </p>
                      )}
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 text-[10px]">لأي استفسار تواصل مع الإدارة:</span>
                        <a
                          href="https://wa.me/963944731209"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-colors"
                        >
                          <span>واتساب: 0944731209</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Order Media if present */}
                  {ord.mediaUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 max-h-32 bg-slate-950 flex items-center justify-center">
                      {ord.mediaType === 'image' ? (
                        <img src={ord.mediaUrl} alt="صورة العطل" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="p-4 text-emerald-400 flex items-center gap-2">
                          <Video className="w-5 h-5" />
                          <span className="text-xs">فيديو العطل مرفق</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price and Schedule if given by technician */}
                  {(ord.price || ord.scheduledTime) && (
                    <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      {ord.price && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">السعر المقترح:</span>
                          <span className="font-black text-emerald-400">{ord.price} ر.س</span>
                        </div>
                      )}
                      {ord.scheduledTime && (
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">موعد الزيارة:</span>
                          <span className="font-bold text-white text-[11px]">{ord.scheduledTime}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Section for Completed Orders */}
                  {ord.status === 'completed' && (
                    <div className="mt-2.5">
                      {ord.review ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              تقييمك لعمل الفني عمر:
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= ord.review!.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-200 italic leading-relaxed">
                            &ldquo;{ord.review.comment}&rdquo;
                          </p>
                          <span className="text-[9px] text-slate-400 block text-left">
                            تم النشر في سجل الفني • {ord.review.createdAt}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>اكتمل الطلب! قيّم الفني الآن</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              أضف تقييمك بالنجوم وتعليقك ليظهر في سجل الأرباح للفني
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openRatingModal(ord.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
                          >
                            <Star className="w-3.5 h-3.5 fill-slate-950" />
                            <span>تقييم بالنجوم</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions: Open chat to negotiate price and time */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {ord.location.address}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderIdForChat(ord.id);
                        setActiveTab('chat');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>مراسلة الفني لتحديد السعر والموعد</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: LIVE CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[380px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {/* Chat Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    عمر
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 absolute -bottom-0.5 -right-0.5"></span>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">الفني عمر (كهرباء وصحية)</h5>
                  <span className="text-[10px] text-slate-400">متصل الآن • الاتفاق على السعر والموعد</span>
                </div>
              </div>

              {activeOrderObj && (
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                  {activeOrderObj.serviceTitle}
                </span>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {currentOrderChatMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                  <span>لا توجد رسائل سابقة. يمكنك بدء المحادثة والاتفاق على السعر والموعد الآن!</span>
                </div>
              ) : (
                currentOrderChatMessages.map((msg) => {
                  const isMe = msg.sender === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                          isMe
                            ? 'bg-emerald-500 text-slate-950 rounded-br-xs font-medium'
                            : 'bg-slate-800 text-white rounded-bl-xs border border-slate-700'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        {msg.offerPrice && (
                          <div className="mt-1.5 pt-1 border-t border-black/10 text-[10px] font-bold">
                            عرض سعر مقترح: {msg.offerPrice} ر.س
                          </div>
                        )}
                        {msg.proposedTime && (
                          <div className="text-[10px] font-bold mt-0.5">
                            الموعد المقترح: {msg.proposedTime}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب رسالتك، السعر المقترح، أو موعدك..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-emerald-500 outline-none"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center hover:bg-emerald-400 active:scale-95 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Android Bottom Navigation */}
      <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md px-2 py-2 flex items-center justify-around z-20">
        {[
          { id: 'home', label: 'الرئيسية', icon: Zap },
          { id: 'new_order', label: 'طلب جديد', icon: PlusCircle },
          { id: 'my_orders', label: 'طلباتي', icon: FileText, badge: orders.length },
          { id: 'chat', label: 'المراسلة', icon: MessageSquare },
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
              className={`relative flex flex-col items-center gap-0.5 text-[10px] transition-colors py-1 px-3 rounded-xl ${
                isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[8px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Rating Modal for Customer */}
      {ratingModalOrderId && (
        <div className="absolute inset-0 z-50 bg-black/85 p-4 flex flex-col justify-center backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">تقييم عمل الفني عمر</h4>
                  <span className="text-[10px] text-slate-400">سيظهر تقييمك في سجل أرباح الفني</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRatingModalOrderId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Star Rating Selector */}
            <div className="text-center space-y-2 py-1">
              <span className="text-xs text-slate-300 font-semibold block">كم نجمة يستحق الفني؟</span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRatingStars(star);
                      playClickSound();
                    }}
                    className="p-1 hover:scale-125 active:scale-95 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingStars
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-400 block">
                {ratingStars === 5 && 'ممتاز جداً 5 نجوم (عمل متقن واحترافي) ⭐'}
                {ratingStars === 4 && 'جيد جداً 4 نجوم (خدمة سريعة) ⭐'}
                {ratingStars === 3 && 'جيد 3 نجوم ⭐'}
                {ratingStars === 2 && 'مقبول 2 نجوم'}
                {ratingStars === 1 && 'يحتاج لتحسين'}
              </span>
            </div>

            {/* Quick Comment Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 block">عبارات سريعة للاختيار:</span>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {[
                  '⚡ وصول سريع وفي الموعد',
                  '🛠️ شغل نظيف ومتقن',
                  '💰 سعر مناسب وعادل',
                  '🤝 تعامل راقي وأمين',
                  '💯 أنصح بالتعامل معه بشدة'
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRatingComment((prev) => (prev ? `${prev} - ${tag}` : tag));
                      playClickSound();
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Comment Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">أضف تعليقك النصي:</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="اكتب تعليقك بالتفصيل (مثال: الفني عمر محترف جداً، قام بإصلاح التماس الكهربائي بسرعة وأمان وبسعر مناسب)..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRatingSubmit}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>إرسال التقييم لسجل الفني</span>
              </button>
              <button
                type="button"
                onClick={() => setRatingModalOrderId(null)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Auth Modal for Guest Users when submitting or logging in */}
      {showQuickAuthModal && (
        <div className="absolute inset-0 z-50 bg-black/85 p-4 flex flex-col justify-center backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">تفعيل الحساب وإرسال الطلب</h4>
                  <span className="text-[10px] text-emerald-400">تفعيل تلقائي سريع برقم الموبايل</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAuthModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                أنت حالياً في <strong className="text-amber-400">وضع المعاينة</strong>. لتثبيت طلبك وإرساله فوراً للفني عمر وسماع نغمة الموافقة، يرجى تأكيد رقم موبايلك:
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">الاسم:</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">رقم الموبايل:</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    dir="ltr"
                    placeholder="09XXXXXXXX"
                    className="w-full text-right px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>سيتم قراءة كود التحقق أوتوماتيكياً وتفعيل حسابك بضغطة واحدة!</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsLoggedIn(true);
                  setIsGuestPreview(false);
                  setShowQuickAuthModal(false);
                  setAuthStep('authenticated');
                  if (problemDescription.trim()) {
                    dispatchOrder();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تفعيل فوري وإرسال الطلب للفني</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAuthModal(false)}
                className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                متابعة المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapModal && (
        <div className="absolute inset-0 z-50 bg-black/80 p-3 flex flex-col justify-center backdrop-blur-sm">
          <div className="h-[420px] w-full">
            <MapPicker
              initialLocation={location}
              onSelectLocation={(loc) => {
                setLocation(loc);
                setShowMapModal(false);
              }}
              onClose={() => setShowMapModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
