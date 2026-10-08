import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wrench,
  Zap,
  Droplets,
  Volume2,
  Sparkles,
  Layers,
  ArrowRightLeft,
  ExternalLink,
  ShieldAlert,
  Plus,
  RefreshCw,
  Download,
  Share2,
  Phone,
  MessageCircle,
  Database
} from 'lucide-react';
import { MaintenanceOrder, ChatMessage, OrderStatus } from './types';
import { CustomerApp } from './components/CustomerApp';
import { TechnicianApp } from './components/TechnicianApp';
import { playOrderApprovedSound, playNewOrderIncomingSound, playClickSound } from './utils/audio';
import {
  subscribeToOrders,
  subscribeToChats,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  submitOrderReviewInFirestore,
  sendChatMessageToFirestore,
  seedInitialFirestoreData,
} from './services/orderService';
import { testConnection } from './firebase';

// Initial preloaded orders so the user can experience the platform immediately
const INITIAL_ORDERS: MaintenanceOrder[] = [
  {
    id: 'ord-101',
    customerName: 'عبدالله السبيعي',
    customerPhone: '0501234567',
    category: 'electricity',
    serviceTitle: 'انقطاع كامل وتماس في القاطع الرئيسي',
    description: 'حدث التماس كهربائي في لوحة التوزيع الداخلية بعد تشغيل المكيف، وفصل القاطع الرئيسي مع تصاعد رائحة خفيفة.',
    urgency: 'urgent',
    location: {
      lat: 24.7136,
      lng: 46.6753,
      address: 'شارع التخصصي، حي العليا',
      city: 'الرياض',
    },
    mediaUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    status: 'pending',
    createdAt: 'منذ 10 دقائق',
  },
  {
    id: 'ord-102',
    customerName: 'سارة المنصور',
    customerPhone: '0549876543',
    category: 'plumbing',
    serviceTitle: 'تسريب مياه حاد تحت خلاط المطبخ',
    description: 'يوجد تسريب مستمر من ماسورة التغذية الساخنة أسفل المغسلة يتدفق داخل الخزانة، نرجو الحضور لتغيير الليات والفحص.',
    urgency: 'normal',
    location: {
      lat: 24.821,
      lng: 46.685,
      address: 'حي النرجس، تقاطع طريق عثمان بن عفان',
      city: 'الرياض',
    },
    mediaUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    status: 'completed',
    createdAt: 'اليوم',
    price: 180,
    scheduledTime: 'اليوم الساعة 05:00 عصراً',
  },
  {
    id: 'ord-100',
    customerName: 'فيصل الشمري',
    customerPhone: '0561122334',
    category: 'electricity',
    serviceTitle: 'تركيب لوحة قواطع جديدة وتمديد إنارة سبوت لايت',
    description: 'تم فحص الأحمال وتركيب لوحة ألمانية متطورة وتمديد الإنارة في الصالة.',
    urgency: 'normal',
    location: {
      lat: 24.72,
      lng: 46.68,
      address: 'حي المروج، الرياض',
      city: 'الرياض',
    },
    status: 'completed',
    createdAt: 'أمس',
    price: 320,
    scheduledTime: 'أمس 04:00 عصراً',
    review: {
      rating: 5,
      comment: 'ما شاء الله تبارك الله، الفني عمر فنان ومتقن لعمله جداً، وصل على الموعد بالدقيقة ونظّف المكان بعد الانتهاء والأسعار معقولة جداً. أنصح به بشدة!',
      createdAt: 'أمس 06:30 مساءً',
    },
  },
];

const INITIAL_CHATS: ChatMessage[] = [
  {
    id: 'msg-1',
    orderId: 'ord-102',
    sender: 'customer',
    text: 'السلام عليكم يا فني عمر، متى تستطيع الحضور لفحص تسريب المطبخ؟',
    timestamp: '03:15 م',
  },
  {
    id: 'msg-2',
    orderId: 'ord-102',
    sender: 'technician',
    text: 'وعليكم السلام ورحمة الله! جاهز للحضور اليوم عند الساعة 05:00 عصراً، والسعر التقديري 180 ريال شامل تبديل الليات الألمانية مع ضمان.',
    timestamp: '03:18 م',
    type: 'price_offer',
    offerPrice: 180,
    proposedTime: 'اليوم 05:00 م',
  },
  {
    id: 'msg-3',
    orderId: 'ord-102',
    sender: 'customer',
    text: 'ممتاز جداً ومعتمد، في انتظارك على الموعد والعنوان المسجل في الخريطة.',
    timestamp: '03:20 م',
  },
];

export default function App() {
  // Shared state connecting Customer and Technician seamlessly
  const [orders, setOrders] = useState<MaintenanceOrder[]>(INITIAL_ORDERS);
  const [chats, setChats] = useState<ChatMessage[]>(INITIAL_CHATS);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // App Layout View Modes: 'dual' (Side-by-side Android phones) | 'customer' | 'technician'
  const [viewMode, setViewMode] = useState<'dual' | 'customer' | 'technician'>('dual');

  // Initialize Firestore listeners and bootstrap data
  useEffect(() => {
    // Test connection on boot
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    // Seed sample data if collections are empty
    seedInitialFirestoreData(INITIAL_ORDERS, INITIAL_CHATS);

    // Subscribe to real-time order updates
    const unsubscribeOrders = subscribeToOrders((cloudOrders) => {
      if (cloudOrders.length > 0) {
        setOrders(cloudOrders);
      }
    });

    // Subscribe to real-time chat updates
    const unsubscribeChats = subscribeToChats((cloudChats) => {
      if (cloudChats.length > 0) {
        setChats(cloudChats);
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeChats();
    };
  }, []);

  // Add new order from customer (persisted to Firestore)
  const handleAddOrder = (newOrder: MaintenanceOrder) => {
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    saveOrderToFirestore(newOrder);
    // Play distinctive incoming alert chime for technician!
    playNewOrderIncomingSound(newOrder.serviceTitle);
  };

  // Submit customer rating & review for completed orders
  const handleReviewOrder = (orderId: string, rating: number, comment: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            review: {
              rating,
              comment,
              createdAt: 'اليوم ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            },
          };
        }
        return ord;
      })
    );
    submitOrderReviewInFirestore(orderId, rating, comment);
  };

  // Update order status (by technician, persisted to Firestore)
  const handleUpdateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    price?: number,
    scheduledTime?: string,
    cancellationReason?: string
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status,
            price: price !== undefined ? price : ord.price,
            scheduledTime: scheduledTime !== undefined ? scheduledTime : ord.scheduledTime,
            cancellationReason: cancellationReason !== undefined ? cancellationReason : ord.cancellationReason,
          };
        }
        return ord;
      })
    );
    updateOrderStatusInFirestore(orderId, status, { price, scheduledTime, cancellationReason });
  };

  // Send chat message (persisted to Firestore)
  const handleSendMessage = (msg: ChatMessage) => {
    setChats((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
    sendChatMessageToFirestore(msg);
  };

  // Quick test order helper
  const handleGenerateSampleOrder = () => {
    const isElec = Math.random() > 0.5;
    const sample: MaintenanceOrder = {
      id: `ord-${Date.now()}`,
      customerName: 'خالد العمري',
      customerPhone: '0567788990',
      category: isElec ? 'electricity' : 'plumbing',
      serviceTitle: isElec ? 'تركيب قاطع ذكي وصيانة إنارة LED' : 'صيانة مضخة مياه وتغيير محابس',
      description: isElec
        ? 'أرغب بتركيب قاطع إضافي لمكيف جديد وتمديد أسلاك 6 ملم مع الحماية.'
        : 'المضخة العلوية تعمل باستمرار ولا تفصل، أحتاج فحص العوامة الكهربائية والسباكة.',
      urgency: 'normal',
      location: {
        lat: 24.75,
        lng: 46.65,
        address: 'شارع التحلية، حي السليمانية',
        city: 'الرياض',
      },
      status: 'pending',
      createdAt: 'الآن',
    };
    setOrders((prev) => [sample, ...prev]);
    saveOrderToFirestore(sample);
    // Play technician audio alert
    playNewOrderIncomingSound(sample.serviceTitle);
  };

  // Reset to initial data in state and sync with Firestore
  const handleResetData = async () => {
    playClickSound();
    setOrders(INITIAL_ORDERS);
    setChats(INITIAL_CHATS);
    for (const ord of INITIAL_ORDERS) {
      await saveOrderToFirestore(ord);
    }
    for (const chat of INITIAL_CHATS) {
      await sendChatMessageToFirestore(chat);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Platform Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Zap className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white">منصة &quot;اطلب فني&quot;</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  تطبيقان أندرويد متكاملان
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                تطبيق الزبون + لوحة تحكم الفني المعتمد • كهرباء وصحية
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center text-xs">
              <button
                onClick={() => {
                  playClickSound();
                  setViewMode('dual');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'dual'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض هاتف الزبون بجانب هاتف الفني لمشاهدة التفاعل المباشر"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">المحاكي المزدوج</span>
                <span className="sm:hidden">مزدوج</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setViewMode('customer');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'customer'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>الزبون</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setViewMode('technician');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'technician'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>الفني</span>
              </button>
            </div>

            {/* Quick Sound Test buttons */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => {
                  playNewOrderIncomingSound();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-400 border border-slate-700 text-xs font-semibold transition-colors"
                title="تجربة رنة تنبيه الفني عند وصول طلب صيانة جديد"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>رنة الفني (طلب جديد) 🚨</span>
              </button>

              <button
                onClick={() => {
                  playOrderApprovedSound();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-semibold transition-colors"
                title="تجربة الإشعار الصوتي للزبون عند الموافقة على الطلب"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>رنة الزبون (الموافقة) 🔔</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Control Banner & Quick Guide */}
      <section className="bg-slate-900/40 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              لوحة الفني محمية برمز مرور آمن 🔒
            </span>
            <span className="text-slate-400 hidden lg:inline">
              | جرب إنشاء طلب من هاتف الزبون ووافق عليه من هاتف الفني لسماع الإشعار الصوتي والتفاوض بالمحادثة!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>قاعدة البيانات السحابية: متصلة ⚡</span>
            </div>

            <button
              onClick={handleGenerateSampleOrder}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>إضافة طلب عطل تجريبي</span>
            </button>

            <button
              onClick={handleResetData}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="إعادة تعيين البيانات ومزامنتها مع السحابة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* Main Apps Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        
        {/* DUAL MODE: Both Android Phones Side-by-Side */}
        {viewMode === 'dual' && (
          <div className="space-y-6">
            
            {/* Explanatory Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <h3 className="font-black text-sm text-white">
                    المحاكاة التفاعلية المباشرة: الزبون 📱 الفني 🛠️
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  كلا التطبيقين يعملان بنظام تزامن فوري؛ أي طلب يرسله الزبون يظهر مباشرة في هاتف الفني، وعندما يضغط الفني على 
                  <strong className="text-emerald-400 font-bold"> &quot;الموافقة على الطلب&quot; </strong>
                  يُصدر هاتف الزبون رنة إشعار صوتي أندرويد حقيقية 🔔، ويمكنهما التراسل والاتفاق على السعر والموعد في نفس اللحظة!
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewMode('customer')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700 transition-colors"
                >
                  تكبير تطبيق الزبون ↗
                </button>
                <button
                  onClick={() => setViewMode('technician')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700 transition-colors"
                >
                  تكبير تطبيق الفني ↗
                </button>
              </div>
            </div>

            {/* Side-by-side Dual Device Frames */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-items-center">
              
              {/* Device 1: Customer Phone */}
              <div className="w-full max-w-[390px] flex flex-col items-center">
                <div className="flex items-center justify-between w-full px-4 mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    1. هاتف الزبون (اطلب فني)
                  </span>
                  <span className="text-[10px] text-slate-400">تفعيل تلقائي بالموبايل</span>
                </div>

                {/* Android Phone Shell */}
                <div className="w-full aspect-[9/18.5] min-h-[640px] rounded-[44px] bg-slate-950 border-[9px] border-slate-800 shadow-2xl shadow-emerald-950/30 overflow-hidden flex flex-col relative ring-1 ring-white/10">
                  {/* Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                  </div>

                  {/* Status Bar */}
                  <div className="pt-2 px-5 pb-1 text-[11px] font-medium flex items-center justify-between bg-slate-900/90 text-slate-300 z-40 select-none">
                    <span>10:45</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <span className="text-[10px]">100%</span>
                    </div>
                  </div>

                  {/* Customer App Content */}
                  <CustomerApp
                    orders={orders}
                    chats={chats}
                    onAddOrder={handleAddOrder}
                    onSendMessage={handleSendMessage}
                    onReviewOrder={handleReviewOrder}
                  />

                  {/* Android Bottom Home Pill */}
                  <div className="h-3.5 bg-slate-900 flex items-center justify-center">
                    <div className="w-24 h-1 rounded-full bg-slate-600/50"></div>
                  </div>
                </div>
              </div>

              {/* Device 2: Technician Phone */}
              <div className="w-full max-w-[390px] flex flex-col items-center">
                <div className="flex items-center justify-between w-full px-4 mb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    2. لوحة تحكم الفني (عمر)
                  </span>
                  <span className="text-[10px] text-slate-400">لوحة التحكم المحمية 🔒</span>
                </div>

                {/* Android Phone Shell */}
                <div className="w-full aspect-[9/18.5] min-h-[640px] rounded-[44px] bg-slate-950 border-[9px] border-slate-800 shadow-2xl shadow-amber-950/20 overflow-hidden flex flex-col relative ring-1 ring-white/10">
                  {/* Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                  </div>

                  {/* Status Bar */}
                  <div className="pt-2 px-5 pb-1 text-[11px] font-medium flex items-center justify-between bg-slate-900/90 text-slate-300 z-40 select-none">
                    <span>10:45</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <span className="text-[10px]">94%</span>
                    </div>
                  </div>

                  {/* Technician App Content */}
                  <TechnicianApp
                    orders={orders}
                    chats={chats}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onSendMessage={handleSendMessage}
                  />

                  {/* Android Bottom Home Pill */}
                  <div className="h-3.5 bg-slate-900 flex items-center justify-center">
                    <div className="w-24 h-1 rounded-full bg-slate-600/50"></div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SINGLE CUSTOMER APP MODE */}
        {viewMode === 'customer' && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-full max-w-[420px] aspect-[9/18.5] min-h-[680px] rounded-[48px] bg-slate-950 border-[10px] border-slate-800 shadow-2xl shadow-emerald-950/30 overflow-hidden flex flex-col relative ring-1 ring-white/10">
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
              </div>
              <div className="pt-2 px-5 pb-1 text-[11px] font-medium flex items-center justify-between bg-slate-900/90 text-slate-300 z-40 select-none">
                <span>10:45</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <span className="text-[10px]">100%</span>
                </div>
              </div>

              <CustomerApp
                orders={orders}
                chats={chats}
                onAddOrder={handleAddOrder}
                onSendMessage={handleSendMessage}
                onReviewOrder={handleReviewOrder}
              />

              <div className="h-3.5 bg-slate-900 flex items-center justify-center">
                <div className="w-24 h-1 rounded-full bg-slate-600/50"></div>
              </div>
            </div>
          </div>
        )}

        {/* SINGLE TECHNICIAN APP MODE */}
        {viewMode === 'technician' && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-full max-w-[420px] aspect-[9/18.5] min-h-[680px] rounded-[48px] bg-slate-950 border-[10px] border-slate-800 shadow-2xl shadow-amber-950/20 overflow-hidden flex flex-col relative ring-1 ring-white/10">
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
              </div>
              <div className="pt-2 px-5 pb-1 text-[11px] font-medium flex items-center justify-between bg-slate-900/90 text-slate-300 z-40 select-none">
                <span>10:45</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <span className="text-[10px]">94%</span>
                </div>
              </div>

              <TechnicianApp
                orders={orders}
                chats={chats}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onSendMessage={handleSendMessage}
              />

              <div className="h-3.5 bg-slate-900 flex items-center justify-center">
                <div className="w-24 h-1 rounded-full bg-slate-600/50"></div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Platform Features Footer & Management Contact */}
      <footer className="border-t border-slate-900 bg-slate-950/95 py-6 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-right">
          <div>
            <span className="font-bold text-white text-sm block">منصة &quot;اطلب فني&quot; للكهرباء والأعمال الصحية</span>
            <span className="text-[11px] text-slate-500">
              تطبيق الزبون (تفعيل برقم الموبايل، وسائط، خريطة، إشعار صوتي) • لوحة تحكم الفني المعتمد
            </span>
          </div>

          {/* Contact Management & WhatsApp */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-slate-300 font-semibold text-xs">للتواصل مع الإدارة:</span>
            
            {/* Phone Call Button */}
            <a
              href="tel:0944731209"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold transition-all hover:border-slate-700"
              title="اتصال هاتفي بالإدارة"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span dir="ltr">0944731209</span>
            </a>

            {/* WhatsApp Direct Button */}
            <a
              href="https://wa.me/963944731209"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
              title="مراسلة الإدارة عبر واتساب"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>واتساب الإدارة: <span dir="ltr">0944731209</span></span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
