import React, { useState, useEffect, useRef } from 'react';
import {
  Utensils,
  Snowflake,
  Flame,
  Candy,
  Fuel,
  ShoppingCart,
  Camera,
  Share2,
  Trash2,
  Sparkles,
  ArrowLeft,
  X,
  Smartphone,
  HelpCircle,
  Mic,
  CheckCircle2,
  Loader2,
  ScanLine,
  Plus
} from 'lucide-react';
import {
  INITIAL_FAMILY,
  YAMKINO_STORES,
  AUTO_PRICE_DB,
  PRODUCT_MINIMUM,
  VISUAL_CATEGORIES,
  MAIN_RECIPES,
  BOMZH_IMGS,
  BOMZH_MENU_30,
  TREATS_30,
  GAS_STATION_MENU,
  DAYS_OF_WEEK
} from './constants';
import {
  MainTab,
  ActivePanel,
  VisualRecipe,
  CustomBuyItem,
  CustomFridgeItem,
  PurchaseReceipt,
  ParsedReceiptItem
} from './types';
import { askGemini, recognizeReceiptWithGemini } from './services/geminiService';

const THEME = {
  frost: 'bg-gradient-to-br from-sky-100 to-sky-200 border border-sky-300 text-sky-900 shadow-sm',
  market: 'bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-300 text-emerald-900 shadow-sm',
  vault: 'bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 text-amber-900 shadow-sm',
  fire: 'bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300 text-orange-900 shadow-sm',
  candy: 'bg-gradient-to-br from-pink-100 to-rose-200 border border-pink-300 text-rose-900 shadow-sm',
  galaxy: 'bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-300 text-indigo-900 shadow-sm',
  lime: 'bg-gradient-to-br from-lime-100 to-lime-200 border border-lime-300 text-lime-950 shadow-sm',
  gas: 'bg-gradient-to-br from-yellow-200 to-amber-300 border border-yellow-500 text-amber-950 shadow-sm'
};

export default function App() {
  // Navigation & UI state
  const [currentTab, setCurrentTab] = useState<MainTab>('menu');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [mobileSimulator, setMobileSimulator] = useState<boolean>(true); // default true for clean phone frame
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [photoViewerImg, setPhotoViewerImg] = useState<{ url: string; title: string } | null>(null);

  // Recipe detail modal & timer
  const [activeRecipe, setActiveRecipe] = useState<VisualRecipe | null>(null);
  const [recipeModalTab, setRecipeModalTab] = useState<'instructions' | 'ingredients'>('instructions');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Recipe filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyHighRated, setOnlyHighRated] = useState<boolean>(true);
  const [ratings, setRatings] = useState<Record<string, number>>({
    r1: 5, r2: 5, r3: 5, r4: 5, r5: 5, r6: 4, r7: 5, r8: 5, r9: 3, r10: 4, bm1: 5, bm4: 4
  });
  const [menuSubMode, setMenuSubMode] = useState<'tiles' | 'week'>('tiles');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [bomzhFilter, setBomzhFilter] = useState<string>('all');
  const [treatsFilter, setTreatsFilter] = useState<string>('all');
  const [gasFilter, setGasFilter] = useState<string>('all');

  // Inventory & Shopping state
  const [stockStatus, setStockStatus] = useState<Record<string, 'home' | 'out'>>({
    p0: 'home', p1: 'home', p2: 'out', p3: 'home', p4: 'home', p5: 'out', p6: 'home',
    p7: 'home', p8: 'home', p9: 'home', p10: 'home', p11: 'home', p12: 'home', p13: 'home'
  });
  const [customFridgeItems, setCustomFridgeItems] = useState<CustomFridgeItem[]>([
    { name: 'Яблоки с Центрального рынка (1.5 кг)', cat: '🍎 Фрукты' },
    { name: 'Свежая зелень и огурцы', cat: '🥒 Овощи' }
  ]);
  const [customToBuy, setCustomToBuy] = useState<CustomBuyItem[]>([
    { name: '1. Чупа-Чупс (Chupa Chups микс 5 шт)', unit: '1 уп (5 шт)', price: 89, store: 'Пятёрочка Ямкино (Центр. Усадьба, 43)', who: 'Для Егора (7)', qty: 1 },
    { name: '4. Пирожное Orion Choco Pie (12 шт)', unit: '1 кор (12 шт)', price: 179, store: 'METRO (Новые Псарьки)', who: 'Для Вари (17)', qty: 1 }
  ]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseReceipt[]>([
    { date: 'Сегодня, 14:20', isToday: true, item: 'Капучино XL + Френч-дог', store: 'АЗС Трасса (Ямкино, Горьковское ш. 35 км)', mode: '⛽ На заправке', price: 459, photo: null },
    { date: 'Вчера, 18:20', isToday: false, item: 'Мясной цех, Сыры, Крупы в нычку', store: 'Гипермаркет Глобус (Случайный)', mode: '🛒 Офлайн закупка', price: 3450, photo: null }
  ]);

  // AI & Voice Assistant
  const [aiInput, setAiInput] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inputs in forms
  const [buyNameInp, setBuyNameInp] = useState<string>('');
  const [buyUnitInp, setBuyUnitInp] = useState<string>('1 уп');
  const [buyPriceInp, setBuyPriceInp] = useState<number>(150);
  const [fridgeNameInp, setFridgeNameInp] = useState<string>('');
  const [fridgeCatInp, setFridgeCatInp] = useState<string>('🍎 Фрукты');
  const [roadItemInp, setRoadItemInp] = useState<string>('');
  const [roadPriceInp, setRoadPriceInp] = useState<number>(250);
  const [roadPlaceInp, setRoadPlaceInp] = useState<string>('Пятёрочка (с. Ямкино)');

  // Camera & Multimodal Gemini Receipt OCR state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState<boolean>(false);
  const [recognizedReceiptItems, setRecognizedReceiptItems] = useState<ParsedReceiptItem[]>([]);
  const [camReceiptTitle, setCamReceiptTitle] = useState<string>('Фото-чек закупки');
  const [camReceiptPrice, setCamReceiptPrice] = useState<number>(850);
  const [camReceiptStore, setCamReceiptStore] = useState<string>('Гипермаркет Глобус (Случайный)');

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('DEEV_REACT_STATE_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ratings) setRatings(parsed.ratings);
        if (parsed.stockStatus) setStockStatus(parsed.stockStatus);
        if (parsed.customFridgeItems) setCustomFridgeItems(parsed.customFridgeItems);
        if (parsed.customToBuy) setCustomToBuy(parsed.customToBuy);
        if (parsed.purchaseHistory) setPurchaseHistory(parsed.purchaseHistory);
      }
    } catch (e) {
      console.debug('localStorage error', e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'DEEV_REACT_STATE_v3',
        JSON.stringify({
          ratings,
          stockStatus,
          customFridgeItems,
          customToBuy,
          purchaseHistory
        })
      );
    } catch (e) {}
  }, [ratings, stockStatus, customFridgeItems, customToBuy, purchaseHistory]);

  // Audio kitchen bell
  const playKitchenBell = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [880, 1174.66, 1396.91, 1760];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.22);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.22 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.22);
        osc.stop(ctx.currentTime + idx * 0.22 + 0.65);
      });
    } catch (e) {}
  };

  // Timer loop
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => {
          if (prev > 1) {
            return prev - 1;
          } else {
            setTimerRunning(false);
            playKitchenBell();
            triggerToast('🔔 ДЗИНЬ! Таймер блюда завершен — пора к столу!');
            return 0;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggling accordion panels: Re-clicking collapses it!
  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };

  // Minimum stock calculation
  const inStockMinCount = PRODUCT_MINIMUM.filter(p => stockStatus[p.id] !== 'out').length;
  const totalMinCount = PRODUCT_MINIMUM.length;
  const minPercent = Math.round((inStockMinCount / totalMinCount) * 100);
  const outMinCount = totalMinCount - inStockMinCount;
  const totalBuyBadge = outMinCount + customToBuy.reduce((acc, x) => acc + (x.qty || 1), 0);

  // Financial sums
  const daySpent = purchaseHistory.filter(h => h.isToday).reduce((acc, x) => acc + (x.price || 0), 0);
  const weekSpent = purchaseHistory.reduce((acc, x) => acc + (x.price || 0), 0);
  const monthSpent = weekSpent + 14200;

  // Smart deduplication when adding to buy list
  const addSmartBuyItem = (name: string, unit?: string, price?: number, store?: string, who?: string) => {
    const clean = name.trim();
    if (!clean) return;

    let finalUnit = unit || '1 уп';
    let finalPrice = Number(price) || 150;
    let finalStore = store || 'Пятёрочка Ямкино / Глобус / Рынок';

    for (const [k, info] of Object.entries(AUTO_PRICE_DB)) {
      if (clean.toLowerCase().includes(k)) {
        if (!unit) finalUnit = info.unit;
        if (!price) finalPrice = info.price;
        if (!store) finalStore = info.store;
        break;
      }
    }

    const minMatch = PRODUCT_MINIMUM.find(p => p.name.toLowerCase().includes(clean.toLowerCase()));
    if (minMatch) {
      setStockStatus(prev => ({ ...prev, [minMatch.id]: 'out' }));
      triggerToast(`«${minMatch.name}» отмечен в списке закупки!`);
      return;
    }

    setCustomToBuy(prev => {
      const idx = prev.findIndex(x => x.name.toLowerCase() === clean.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty = (copy[idx].qty || 1) + 1;
        triggerToast(`Дубликат объединен! «${copy[idx].name}» теперь x${copy[idx].qty} шт.`);
        return copy;
      }
      triggerToast(`Добавлено в закупку: «${clean}» (${finalUnit}, ~${finalPrice} ₽)`);
      return [
        {
          name: clean,
          unit: finalUnit,
          price: finalPrice,
          store: finalStore,
          who: who || 'По списку семьи',
          qty: 1
        },
        ...prev
      ];
    });
  };

  // Automatically replenish fridge from receipt OCR items
  const replenishFridgeFromItems = (items: ParsedReceiptItem[]) => {
    if (!items || items.length === 0) return;

    const updatedMinIds: string[] = [];
    const newCustomFridge: CustomFridgeItem[] = [];

    items.forEach(item => {
      const lowName = item.name.toLowerCase();
      const matchedMin = PRODUCT_MINIMUM.find(pm => {
        const keywords = pm.name
          .toLowerCase()
          .replace(/[(),.0-9%]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3);
        return keywords.some(kw => lowName.includes(kw));
      });

      if (matchedMin) {
        updatedMinIds.push(matchedMin.id);
      } else {
        const displayLabel = item.quantity ? `${item.name} (${item.quantity})` : item.name;
        newCustomFridge.push({
          name: displayLabel,
          cat: item.category || '❄️ В холодос'
        });
      }
    });

    if (updatedMinIds.length > 0) {
      setStockStatus(prev => {
        const next = { ...prev };
        updatedMinIds.forEach(id => {
          next[id] = 'home';
        });
        return next;
      });
    }

    if (newCustomFridge.length > 0) {
      setCustomFridgeItems(prev => {
        const existingNames = new Set(prev.map(x => x.name.toLowerCase()));
        const uniqueNew = newCustomFridge.filter(x => !existingNames.has(x.name.toLowerCase()));
        return [...uniqueNew, ...prev];
      });
    }

    setCustomToBuy(prev =>
      prev.filter(buyItem => {
        const buyLow = buyItem.name.toLowerCase();
        return !items.some(rec => {
          const recWord = rec.name.toLowerCase().split(/\s+/)[0];
          return recWord.length > 3 && buyLow.includes(recWord);
        });
      })
    );
  };

  const getRecipeRating = (id: string) => ratings[id] ?? 4;
  const setRecipeRating = (id: string, val: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRatings(prev => ({ ...prev, [id]: val }));
    if (val >= 4) {
      triggerToast(`⭐ Оценка ${val}★ сохранена! Включено в «Мои рецепты DEEV».`);
    } else {
      triggerToast(`Оценка ${val}★ сохранена. Блюдо скрыто из фильтра 4–5★.`);
    }
  };

  // Recipe filtering for Tab 1 (Always compact 2 items per row!)
  const filteredRecipes = (() => {
    let list: VisualRecipe[] = [...MAIN_RECIPES];
    const highRatedBomzh = BOMZH_MENU_30.filter(bm => getRecipeRating(bm.id) >= 4).map(bm => ({
      id: bm.id,
      cat: `Бомж (${bm.cat})`,
      slot: 'Хит',
      title: bm.title,
      time: bm.time,
      kcal: bm.kcal,
      img: BOMZH_IMGS[bm.cat],
      kidsTip: 'Народный хит из запасов, оцененный на 4–5 звезд семьи DEEV!',
      ingredients: ['Картоха, Лук и Морковь (4 кг)', 'Макарики и Спагетти (3 пачки)', 'Тушенка ГОСТ, Томаты и Терияки'],
      steps: [bm.desc, 'Запустите таймер со звонком и зовите всех к столу!']
    }));
    list = list.concat(highRatedBomzh);

    if (selectedCategory !== 'all') {
      list = MAIN_RECIPES.filter(r => r.cat === selectedCategory);
    } else if (onlyHighRated) {
      list = list.filter(r => getRecipeRating(r.id) >= 4);
    }

    if (aiInput.trim()) {
      const q = aiInput.toLowerCase().trim();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q));
    }
    return list;
  })();

  // Handle Gemini culinary questions & voice
  const handleAiAsk = async (customQ?: string) => {
    const q = (customQ || aiInput).trim();
    if (!q) {
      setSettingsModalOpen(true);
      return;
    }

    const low = q.toLowerCase();
    const isQuestion =
      low.includes('?') ||
      low.includes('рецепт') ||
      low.includes('омлет') ||
      low.includes('опмлет') ||
      low.includes('приготов') ||
      low.includes('сделат') ||
      low.includes('как ') ||
      low.includes('сырник') ||
      low.includes('холодос') ||
      low.includes('ужин') ||
      low.includes('завтрак') ||
      low.includes('обед') ||
      low.includes('где ') ||
      low.includes('дешевл') ||
      low.includes('выгодн') ||
      low.includes('порадоват') ||
      low.includes('идея') ||
      low.includes('меню');

    if (isQuestion) {
      setAiLoading(true);
      try {
        const homeProducts = [
          ...PRODUCT_MINIMUM.filter(p => stockStatus[p.id] !== 'out').map(p => p.name),
          ...customFridgeItems.map(f => f.name)
        ].join(', ');
        const ans = await askGemini(
          q,
          `В холодосе и нычках сейчас: ${homeProducts}. Вкусы: Дмитрий (мясо, паста), Елена (сырники, рыба), Варя 17 лет (боулы терияки), Егор 7 лет (сырники, фрикадельки).`
        );
        setAiResponse(ans);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // Receipt text
    const priceMatch = q.match(/(\d+)\s*(р|руб)/i);
    const parsedPrice = priceMatch ? Number(priceMatch[1]) : 0;
    if (low.includes('купил') || low.includes('заправ') || low.includes('потратил') || low.includes('чек')) {
      const nowStr = new Date().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const pr = parsedPrice || 350;
      setPurchaseHistory(prev => [
        {
          date: nowStr,
          isToday: true,
          item: q,
          store: 'Ямкино / Рынок / Глобус / Чек',
          mode: '🧾 Чек с датой',
          price: pr,
          photo: null
        },
        ...prev
      ]);
      setAiResponse(`✅ Чек «${q}» (${pr} ₽) записан в архив от ${nowStr}!`);
      setAiInput('');
      return;
    }

    // Otherwise add to shopping list
    addSmartBuyItem(q, undefined, parsedPrice || undefined, undefined, 'Через поле «Вопросики?»');
    setAiResponse(`🛒 Продукт «${q}» проверен на дубликаты и добавлен в «В магазе»!`);
    setAiInput('');
  };

  // Run Multimodal Gemini OCR
  const processReceiptImageWithGemini = async (dataUrl: string) => {
    setCapturedPhoto(dataUrl);
    setIsAnalyzingReceipt(true);
    triggerToast('🤖 Мультимодальный Gemini распознает чек и пополняет холодос...');
    try {
      const parsed = await recognizeReceiptWithGemini(dataUrl);
      setCamReceiptStore(parsed.store || 'Пятёрочка (с. Ямкино)');
      setCamReceiptPrice(parsed.totalAmount || 850);
      setCamReceiptTitle(
        parsed.summaryTitle || parsed.items.map(i => i.name).join(', ') || 'Распознанный фото-чек'
      );
      setRecognizedReceiptItems(parsed.items || []);
      replenishFridgeFromItems(parsed.items || []);
      triggerToast(
        `✨ Gemini распознал ${parsed.items.length} поз. на ${parsed.totalAmount} ₽ (${parsed.store}) и пополнил холодос!`
      );
    } catch (e) {
      triggerToast('Фото чека готово! Проверьте сумму и сохраните.');
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Camera video capture
  const startLiveCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      }
    } catch (e) {
      triggerToast('Используйте системную камеру через желтую кнопку!');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const stamp = new Date().toLocaleString('ru-RU');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 448, 640, 32);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`DEEV ЧЕК • ${stamp}`, 12, 470);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      await processReceiptImageWithGemini(dataUrl);
    }
  };

  const simulateSampleReceiptScan = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(0, 0, 600, 520);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 560, 480);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('КАССОВЫЙ ЧЕК • ГИПЕРМАРКЕТ ГЛОБУС', 55, 70);
    ctx.font = '16px monospace';
    ctx.fillText('пос. Случайный, Ногинский р-н', 55, 100);
    ctx.fillText('--------------------------------------', 55, 130);
    ctx.font = 'bold 18px monospace';
    ctx.fillText('1. Творог 5% фермерский 800г .... 239 ₽', 55, 170);
    ctx.fillText('2. Курица охлажденная 1.5кг ..... 469 ₽', 55, 210);
    ctx.fillText('3. Яблоки сезонные 1.5кг ........ 160 ₽', 55, 250);
    ctx.fillText('4. Томаты Черри сладкие ......... 220 ₽', 55, 290);
    ctx.fillText('5. Молоко 3.2% 2 пачки .......... 149 ₽', 55, 330);
    ctx.fillText('--------------------------------------', 55, 370);
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#15803d';
    ctx.fillText('ИТОГО К ОПЛАТЕ:                1237 ₽', 55, 415);

    const stamp = new Date().toLocaleString('ru-RU');
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`DEEV AI OCR • ${stamp}`, 55, 465);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    await processReceiptImageWithGemini(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = Math.round((img.height / img.width) * 640) || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const stamp = new Date().toLocaleString('ru-RU');
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(`DEEV ЧЕК • ${stamp}`, 12, canvas.height - 11);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
          await processReceiptImageWithGemini(dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const savePhotoReceipt = () => {
    const nowStr = new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (recognizedReceiptItems.length > 0) {
      replenishFridgeFromItems(recognizedReceiptItems);
    }

    setPurchaseHistory(prev => [
      {
        date: nowStr,
        isToday: true,
        item: camReceiptTitle || 'Фото-чек покупки',
        store: camReceiptStore,
        mode: capturedPhoto ? '📸 AI Фото-чек' : '🧾 Чек с датой',
        price: camReceiptPrice || 850,
        photo: capturedPhoto,
        recognizedItems: recognizedReceiptItems.map(i => `${i.name} (${i.quantity}) — ${i.price}₽`)
      },
      ...prev
    ]);
    setCameraModalOpen(false);
    setCapturedPhoto(null);
    setRecognizedReceiptItems([]);
    setActivePanel('budget');
    triggerToast(`📸 Чек на ${camReceiptPrice} ₽ сохранен, запасы холодоса пополнены!`);
  };

  return (
    <div className={`w-full min-h-screen ${mobileSimulator ? 'flex justify-center bg-slate-900 py-3 sm:py-6 px-1 sm:px-3' : 'bg-[#faf7f2]'}`}>
      <div
        id="app-shell"
        className={`w-full relative pb-28 transition-all ${
          mobileSimulator
            ? 'max-w-[420px] bg-[#faf7f2] rounded-[38px] sm:rounded-[44px] border-[8px] sm:border-[10px] border-slate-950 shadow-2xl overflow-hidden min-h-[860px]'
            : 'max-w-2xl mx-auto px-2'
        }`}
      >
        {/* TOAST POPUP */}
        {toastMessage && (
          <div className="fixed top-3 right-3 left-3 sm:left-auto sm:w-96 z-50 bg-white border-2 border-indigo-400 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${THEME.galaxy} flex items-center justify-center text-base shrink-0`}>
              🚀
            </div>
            <div className="text-xs">
              <strong className="text-indigo-900 block">Галактические Закупки DEEV:</strong>
              <span className="text-slate-600 font-bold">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* 1. ONBOARDING PREFERENCES MODAL */}
        {onboardingOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#fffdf9] border-2 border-amber-300 text-slate-800 w-full max-w-lg rounded-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-5 space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl ${THEME.vault} flex items-center justify-center font-black text-sm shrink-0`}>
                    DEEV
                  </div>
                  <div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${THEME.lime}`}>
                      Вкусы семьи • Ямкино + 10 км
                    </span>
                    <h2 className="font-black text-sm sm:text-base text-slate-900 mt-0.5">
                      Предпочтения семьи DEEV в еде
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setOnboardingOpen(false)}
                  className={`w-7 h-7 rounded-full ${THEME.candy} flex items-center justify-center shrink-0`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INITIAL_FAMILY.map(m => (
                  <div key={m.id} className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-2xl space-y-0.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-slate-900">{m.name}</strong>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${THEME.vault}`}>{m.badge}</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-bold">❤️ Любит: {m.likes.join(', ')}</p>
                    <p className="text-[10px] text-rose-700 font-bold">🚫 Не ест: {m.dislikes.join(', ')}</p>
                  </div>
                ))}
              </div>

              <div className={`${THEME.candy} p-2.5 rounded-2xl text-[11px] font-black`}>
                <span>🛑 Аллергии: Арахис, Острый перец (для Егора)</span>
              </div>

              <button
                onClick={() => setOnboardingOpen(false)}
                className={`w-full ${THEME.lime} font-black text-xs py-3 rounded-2xl shadow-md transition`}
              >
                Сохранить предпочтения и перейти к меню ✨
              </button>
            </div>
          </div>
        )}

        {/* 2. TOP HEADER */}
        <header className="sticky top-0 z-30 bg-[#faf7f2]/95 backdrop-blur-md border-b border-amber-200/80 px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setCurrentTab('menu');
                  }}
                  className={`w-9 h-9 rounded-2xl ${THEME.vault} flex items-center justify-center font-black text-xs shrink-0`}
                >
                  DEEV
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h1 className="font-black text-xs sm:text-sm tracking-tight text-slate-900 truncate">
                      DEEV • Семейный Шеф
                    </h1>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${THEME.market}`}>
                      Ямкино + 10 км
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold truncate">
                    Дмитрий • Елена • Варя (17) • Егор (7)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMobileSimulator(prev => !prev)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Smartphone className="w-3 h-3" />
                {mobileSimulator ? 'На весь экран' : 'Вид телефона'}
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => setCameraModalOpen(true)}
                className={`${THEME.galaxy} px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0`}
              >
                <Camera className="w-3 h-3" /> +AI Чек
              </button>
              <button
                onClick={() => togglePanel('budget')}
                className={`${THEME.vault} px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-0.5 shrink-0`}
              >
                💰 Нед: {weekSpent} ₽
              </button>
              <button
                onClick={() => {
                  setMenuSubMode('week');
                  setCurrentTab('menu');
                }}
                className={`${THEME.fire} px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-0.5 shrink-0`}
              >
                🔥 1130 ккал
              </button>
              <button
                onClick={() => setShareModalOpen(true)}
                className={`${THEME.frost} px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0`}
              >
                <Share2 className="w-3 h-3" /> Скинуть
              </button>
              <button
                onClick={() => setOnboardingOpen(true)}
                className={`${THEME.candy} px-2 py-1 rounded-xl text-[10px] font-black shrink-0`}
              >
                ❤️ Вкусы
              </button>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className={`${THEME.lime} px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0`}
              >
                <HelpCircle className="w-3 h-3" /> Вопросики?
              </button>
            </div>
          </div>
        </header>

        {/* 3. MAIN ACCORDION PANELS */}
        <div className="px-2.5 pt-2.5 space-y-2.5">
          {/* 4 Top Card Widgets - ALWAYS 2x2 grid so they are NEVER squished or clipped! */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => togglePanel('minimum')}
              className={`${THEME.vault} rounded-2xl p-2.5 text-left flex items-center justify-between transition`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-white/85 flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                  🛡️
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase block opacity-80 truncate">Минимум 100%</span>
                  <strong className="text-xs font-black truncate block">{minPercent}% дома</strong>
                </div>
              </div>
              <span className="text-[10px] font-black bg-white/85 px-1.5 py-0.5 rounded-lg shrink-0 ml-1">
                {activePanel === 'minimum' ? '▲' : '▼'}
              </span>
            </button>

            <button
              onClick={() => togglePanel('fridge')}
              className={`${THEME.frost} rounded-2xl p-2.5 text-left flex items-center justify-between transition`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-white/85 flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                  ❄️
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase block opacity-80 truncate">Холодос + Фрукты</span>
                  <strong className="text-xs font-black truncate block">Дома ({inStockMinCount + customFridgeItems.length})</strong>
                </div>
              </div>
              <span className="text-[10px] font-black bg-white/85 px-1.5 py-0.5 rounded-lg shrink-0 ml-1">
                {activePanel === 'fridge' ? '▲' : '▼'}
              </span>
            </button>

            <button
              onClick={() => togglePanel('budget')}
              className={`${THEME.galaxy} rounded-2xl p-2.5 text-left flex items-center justify-between transition`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-white/85 flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                  📸
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase block opacity-80 truncate">Чеки и Траты</span>
                  <strong className="text-xs font-black truncate block">День: {daySpent} ₽</strong>
                </div>
              </div>
              <span className="text-[10px] font-black bg-white/85 px-1.5 py-0.5 rounded-lg shrink-0 ml-1">
                {activePanel === 'budget' ? '▲' : '▼'}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('shopping')}
              className={`${THEME.market} rounded-2xl p-2.5 text-left flex items-center justify-between transition`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-white/85 flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                  🛒
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase block opacity-80 truncate">Ямкино • Глобус</span>
                  <strong className="text-xs font-black truncate block">В магазе ({totalBuyBadge})</strong>
                </div>
              </div>
              <span className="text-[10px] font-black bg-white/85 px-1.5 py-0.5 rounded-lg shrink-0 ml-1">➔</span>
            </button>
          </div>

          {/* Collapsible Panel 1: Product Minimum */}
          {activePanel === 'minimum' && (
            <div className="bg-white border-2 border-amber-300 rounded-2xl p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between gap-1 border-b border-amber-100 pb-1.5">
                <div onClick={() => togglePanel('minimum')} className="cursor-pointer">
                  <h3 className="font-black text-xs text-slate-900">
                    🛡️ Набор 100%: База на семью (нажмите ▲ свернуть)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Клик переключает: В наличии дома &harr; В магаз
                  </p>
                </div>
                <button
                  onClick={() => togglePanel('minimum')}
                  className={`${THEME.candy} text-[10px] font-black px-2 py-1 rounded-xl shrink-0`}
                >
                  Свернуть ▲
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {PRODUCT_MINIMUM.map(p => {
                  const isHome = stockStatus[p.id] !== 'out';
                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        setStockStatus(prev => ({ ...prev, [p.id]: prev[p.id] === 'out' ? 'home' : 'out' }))
                      }
                      className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between gap-2 ${
                        isHome ? 'bg-amber-50/50 border-amber-200' : 'bg-rose-50 border-rose-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{p.norm}</span>
                        <h4 className="font-black text-[11px] text-slate-900 truncate">{p.name}</h4>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                          isHome ? THEME.lime : THEME.candy
                        }`}
                      >
                        {isHome ? '✅ Дома' : '🛒 В магаз'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Panel 2: Fridge & Fresh items */}
          {activePanel === 'fridge' && (
            <div className="bg-white border-2 border-sky-300 rounded-2xl p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between gap-1 border-b border-sky-100 pb-1.5">
                <div onClick={() => togglePanel('fridge')} className="cursor-pointer">
                  <h3 className="font-black text-xs text-slate-900">
                    ❄️ Что сейчас в холодосе и нычках (нажмите ▲ свернуть)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Пополняется фото-чеком через Gemini или вручную
                  </p>
                </div>
                <button
                  onClick={() => togglePanel('fridge')}
                  className={`${THEME.candy} text-[10px] font-black px-2 py-1 rounded-xl shrink-0`}
                >
                  Свернуть ▲
                </button>
              </div>

              {/* Add form stacked for clean mobile input */}
              <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-2.5 space-y-2">
                <div className="flex gap-1.5">
                  <input
                    value={fridgeNameInp}
                    onChange={e => setFridgeNameInp(e.target.value)}
                    type="text"
                    placeholder="Название (напр., Яблоки Голден, Творог Экомол)..."
                    className="w-full bg-white border border-sky-200 text-xs rounded-xl px-2.5 py-1.5"
                  />
                  <select
                    value={fridgeCatInp}
                    onChange={e => setFridgeCatInp(e.target.value)}
                    className="bg-white border border-sky-200 text-[11px] font-black rounded-xl px-2 py-1.5 text-slate-700 shrink-0"
                  >
                    <option value="🍎 Фрукты">🍎 Фрукты</option>
                    <option value="🥒 Овощи">🥒 Овощи</option>
                    <option value="❄️ В холодос">❄️ В холодос</option>
                    <option value="📦 В нычку">📦 В нычку</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!fridgeNameInp.trim()) return;
                    setCustomFridgeItems(prev => [{ name: fridgeNameInp.trim(), cat: fridgeCatInp }, ...prev]);
                    setFridgeNameInp('');
                    triggerToast(`В холодос добавлено: ${fridgeNameInp}`);
                  }}
                  className={`w-full ${THEME.frost} text-xs font-black py-1.5 rounded-xl`}
                >
                  + Положить в холодос
                </button>
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[9px] font-black text-sky-800 mr-0.5">Быстро:</span>
                  {['🍎 +Яблоки', '🍌 +Бананы', '🍊 +Мандарины', '🍅 +Помидоры', '🥒 +Огурцы', '🌿 +Зелень'].map(
                    item => (
                      <button
                        key={item}
                        onClick={() => {
                          const clean = item.replace('+', '');
                          setCustomFridgeItems(prev => [
                            {
                              name: clean,
                              cat:
                                clean.includes('Огурцы') || clean.includes('Помидоры') || clean.includes('Зелень')
                                  ? '🥒 Овощи'
                                  : '🍎 Фрукты'
                            },
                            ...prev
                          ]);
                          triggerToast(`Добавлено: ${clean}`);
                        }}
                        className="text-[10px] font-bold bg-white border border-sky-200 px-1.5 py-0.5 rounded-lg hover:bg-sky-100"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Lists stacked cleanly so text never chops */}
              <div className="space-y-2">
                <div className="bg-sky-50/40 border border-sky-200 rounded-xl p-2.5">
                  <h4 className="font-black text-[11px] text-sky-900 uppercase mb-1.5">
                    ✅ Сейчас есть в холодосе ({inStockMinCount + customFridgeItems.length}):
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {customFridgeItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const copy = [...customFridgeItems];
                          copy.splice(idx, 1);
                          setCustomFridgeItems(copy);
                          addSmartBuyItem(
                            item.name,
                            '1 кг',
                            165,
                            'Центральный рынок / Пятёрочка Ямкино',
                            item.cat
                          );
                        }}
                        className="p-1.5 rounded-xl bg-white border border-sky-200 flex items-center justify-between cursor-pointer hover:bg-sky-50 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-black text-sky-700 block">{item.cat}</span>
                          <span className="text-[11px] font-black text-slate-800 truncate block">{item.name}</span>
                        </div>
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg shrink-0 ml-2">
                          Кончилось ➔
                        </span>
                      </div>
                    ))}
                    {PRODUCT_MINIMUM.filter(p => stockStatus[p.id] !== 'out').map(p => (
                      <div
                        key={p.id}
                        onClick={() => setStockStatus(prev => ({ ...prev, [p.id]: 'out' }))}
                        className="p-1.5 rounded-xl bg-white border border-sky-200 flex items-center justify-between cursor-pointer hover:bg-sky-50 text-xs"
                      >
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {p.zone === 'fridge' ? '❄️' : '📦'} {p.name}
                        </span>
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg shrink-0 ml-2">
                          Кончилось ➔
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5">
                  <h4 className="font-black text-[11px] text-emerald-900 uppercase mb-1.5">
                    🛒 Кончилось — нужно взять в магазе:
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {PRODUCT_MINIMUM.filter(p => stockStatus[p.id] === 'out').map(p => (
                      <div
                        key={p.id}
                        onClick={() => setStockStatus(prev => ({ ...prev, [p.id]: 'home' }))}
                        className="p-1.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between cursor-pointer hover:bg-emerald-50 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-slate-800 block truncate">🛒 {p.name}</span>
                          <span className="text-[9px] text-emerald-700 font-semibold truncate block">{p.bestStore}</span>
                        </div>
                        <span className={`text-[9px] font-black ${THEME.market} px-2 py-0.5 rounded-lg shrink-0 ml-2`}>
                          Купили ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Panel 3: Budget & Receipts */}
          {activePanel === 'budget' && (
            <div className="bg-white border-2 border-indigo-300 rounded-2xl p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between gap-1 border-b border-indigo-100 pb-1.5">
                <div onClick={() => togglePanel('budget')} className="cursor-pointer">
                  <h3 className="font-black text-xs text-slate-900">
                    💰 Расходы и 📸 AI Фото-чеки
                  </h3>
                  <p className="text-[10px] text-slate-500">Авто-учет расходов семьи DEEV</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCameraModalOpen(true)}
                    className={`${THEME.galaxy} text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1`}
                  >
                    <Camera className="w-3 h-3" /> Чек AI
                  </button>
                  <button
                    onClick={() => togglePanel('budget')}
                    className={`${THEME.candy} text-[10px] font-black px-2 py-1 rounded-xl`}
                  >
                    ▲
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className={`${THEME.frost} p-2 rounded-xl`}>
                  <span className="text-[9px] font-black uppercase block opacity-80">Сегодня</span>
                  <strong className="text-xs sm:text-sm font-black">{daySpent} ₽</strong>
                </div>
                <div className={`${THEME.vault} p-2 rounded-xl`}>
                  <span className="text-[9px] font-black uppercase block opacity-80">Неделя</span>
                  <strong className="text-xs sm:text-sm font-black">{weekSpent} ₽</strong>
                </div>
                <div className={`${THEME.market} p-2 rounded-xl`}>
                  <span className="text-[9px] font-black uppercase block opacity-80">Месяц</span>
                  <strong className="text-xs sm:text-sm font-black">{monthSpent} ₽</strong>
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-2.5 space-y-1.5">
                <span className="text-[11px] font-black text-indigo-950 block">
                  🧾 Добавить чек (что купили по дороге):
                </span>
                <input
                  value={roadItemInp}
                  onChange={e => setRoadItemInp(e.target.value)}
                  type="text"
                  placeholder="Что купили? (напр., Мясо в Глобусе, Овощи на рынке)..."
                  className="w-full bg-white border border-indigo-200 text-xs rounded-xl px-2.5 py-1.5"
                />
                <div className="flex gap-1.5">
                  <input
                    value={roadPriceInp}
                    onChange={e => setRoadPriceInp(Number(e.target.value) || 0)}
                    type="number"
                    placeholder="Сумма ₽"
                    className="w-24 bg-white border border-indigo-200 text-xs rounded-xl px-2.5 py-1.5 font-bold"
                  />
                  <select
                    value={roadPlaceInp}
                    onChange={e => setRoadPlaceInp(e.target.value)}
                    className="w-full bg-white border border-indigo-200 text-[11px] font-bold rounded-xl px-2 py-1.5 text-slate-700"
                  >
                    <option value="Пятёрочка (с. Ямкино)">🏪 Пятёрочка (Ямкино)</option>
                    <option value="ТД Экомол (с. Ямкино)">🥛 ТД Экомол (Ямкино)</option>
                    <option value="Гипермаркет Глобус (Случайный)">🛒 Глобус (Случайный)</option>
                    <option value="METRO Cash & Carry (Новые Псарьки)">📦 METRO (Новые Псарьки)</option>
                    <option value="Центральный рынок Ногинска">🍅 Центральный Рынок</option>
                    <option value="АЗС Трасса (Ямкино 35 км)">⛽ АЗС Трасса (По дороге)</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!roadItemInp.trim()) return;
                    const nowStr = new Date().toLocaleString('ru-RU', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    setPurchaseHistory(prev => [
                      {
                        date: nowStr,
                        isToday: true,
                        item: roadItemInp.trim(),
                        store: roadPlaceInp,
                        mode: '🧾 Чек с датой',
                        price: roadPriceInp || 250,
                        photo: null
                      },
                      ...prev
                    ]);
                    setRoadItemInp('');
                    triggerToast(`Чек «${roadItemInp}» записан в архив!`);
                  }}
                  className={`w-full ${THEME.galaxy} text-xs font-black py-1.5 rounded-xl`}
                >
                  + Записать чек
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {purchaseHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-[#faf7f2] border border-amber-200 flex items-center justify-between gap-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {h.photo && (
                        <img
                          src={h.photo}
                          alt="Чек"
                          onClick={() => setPhotoViewerImg({ url: h.photo!, title: `${h.item} (${h.date})` })}
                          className="w-10 h-10 rounded-lg object-cover border border-indigo-400 cursor-pointer shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-slate-500">📅 {h.date}</span>
                        <p className="font-black text-[11px] text-slate-900 truncate">{h.item}</p>
                        <p className="text-[10px] text-slate-500 truncate">📍 {h.store}</p>
                      </div>
                    </div>
                    <strong className="text-xs font-black text-emerald-700 shrink-0">{h.price} ₽</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SMART COMMAND CENTER (Cleanly stacked vertically on mobile, so inputs NEVER squish!) */}
          <div className="space-y-2.5">
            {/* Box 1: Voice & Gemini Q&A */}
            <div className="bg-white border-2 border-orange-200 p-3 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-orange-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-600" /> Еда кончается пора на рынок Лен
                </span>
                <button
                  onClick={() => {
                    const SpeechRecognition =
                      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) {
                      triggerToast('Голос недоступен — напишите текст и нажмите «Вопросики?»');
                      return;
                    }
                    const rec = new SpeechRecognition();
                    rec.lang = 'ru-RU';
                    rec.start();
                    rec.onresult = (ev: any) => {
                      const transcript = ev.results[0][0].transcript;
                      setAiInput(transcript);
                      handleAiAsk(transcript);
                    };
                  }}
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${THEME.candy} flex items-center gap-1 shrink-0`}
                >
                  <Mic className="w-3 h-3" /> Голос
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiAsk()}
                  type="text"
                  placeholder="Спроси: «рецепт омлета», «что сделать из холодоса?»..."
                  className="w-full bg-amber-50/70 border border-amber-300 text-slate-900 placeholder-slate-400 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none"
                />
                <button
                  onClick={() => handleAiAsk()}
                  disabled={aiLoading}
                  className={`${THEME.lime} font-black text-xs px-3 py-2 rounded-xl shrink-0 flex items-center gap-1`}
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🤔 Вопросики?'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => handleAiAsk('Рецепт пышного омлета')}
                  className="text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg"
                >
                  🍳 Омлет
                </button>
                <button
                  onClick={() => handleAiAsk('Что приготовить из того что есть в холодосе?')}
                  className="text-[10px] font-extrabold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 px-2 py-0.5 rounded-lg"
                >
                  ❄️ Из холодоса
                </button>
                <button
                  onClick={() => handleAiAsk('Где выгоднее мясо и творог в Ямкино и Глобусе?')}
                  className="text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg"
                >
                  📍 Где дешевле?
                </button>
                <button
                  onClick={() => handleAiAsk('Чем порадовать Егора и Варю сегодня?')}
                  className="text-[10px] font-extrabold bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-lg"
                >
                  🧒 Идея детям
                </button>
              </div>

              {aiResponse && (
                <div className={`text-xs ${THEME.lime} p-2.5 rounded-xl font-bold leading-relaxed whitespace-pre-line relative`}>
                  <button
                    onClick={() => setAiResponse(null)}
                    className="absolute top-1 right-2 text-slate-500 hover:text-slate-900 font-black text-sm"
                  >
                    ×
                  </button>
                  {aiResponse}
                </div>
              )}
            </div>

            {/* Box 2: Delivery & Nearby Spots in Clean Grid */}
            <div className="bg-white border-2 border-emerald-200 p-3 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  🛵 Лень ногами? Закажи тут (Ямкино / Ногинск):
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${THEME.market}`}>
                  +Авто-чек
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { name: 'ВкусВилл', sub: 'Беспл. дост.', theme: THEME.market, url: 'https://vkusvill.ru/', price: 1450 },
                  { name: 'ПиццаФабр.', sub: 'Пицца / Вок', theme: THEME.fire, url: 'https://pizzafabrika.ru/', price: 1890 },
                  { name: 'Глобус', sub: 'Мясной цех', theme: THEME.frost, url: 'https://www.globus.ru/', price: 3800 },
                  { name: 'METRO', sub: 'Н. Псарьки', theme: THEME.galaxy, url: 'https://online.metro-cc.ru/', price: 4200 },
                  { name: 'Ямкино 5ка', sub: 'И Экомол', theme: THEME.vault, url: 'https://5ka.ru/', price: 820 },
                  { name: 'Рынок', sub: 'Декабристов', theme: THEME.candy, url: 'https://yandex.ru/maps', price: 1200 }
                ].map(spot => (
                  <button
                    key={spot.name}
                    onClick={() => {
                      const nowStr = new Date().toLocaleString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      });
                      setPurchaseHistory(prev => [
                        {
                          date: nowStr,
                          isToday: true,
                          item: `Онлайн заказ (${spot.name})`,
                          store: spot.name,
                          mode: '🛵 Онлайн-доставка',
                          price: spot.price,
                          photo: null
                        },
                        ...prev
                      ]);
                      window.open(spot.url, '_blank');
                    }}
                    className={`${spot.theme} rounded-xl p-2 text-center transition hover:scale-[1.02]`}
                  >
                    <span className="block text-[11px] font-black leading-tight">{spot.name}</span>
                    <span className="block text-[9px] opacity-80 mt-0.5 truncate">{spot.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. MAIN TABS CONTENT - ALWAYS COMPACT 2 CARDS PER ROW AS REQUESTED! */}
          {/* TAB 1: MENU & RECIPES */}
          {currentTab === 'menu' && (
            <section className="bg-white border border-amber-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[#fff9f0] px-2.5 py-2 flex items-center justify-between gap-1.5 border-b border-amber-200/60">
                <button
                  onClick={() => {
                    const el = document.getElementById('category-pills');
                    if (el) el.scrollBy({ left: -160, behavior: 'smooth' });
                  }}
                  className={`w-7 h-7 rounded-lg ${THEME.vault} flex items-center justify-center shrink-0 font-black text-xs`}
                >
                  ◀
                </button>
                <div id="category-pills" className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-0.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                      selectedCategory === 'all' ? THEME.vault : 'bg-white border border-amber-200 text-slate-700'
                    }`}
                  >
                    ⭐ Мои рецепты (4–5★)
                  </button>
                  {VISUAL_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`text-[11px] font-black px-2 py-1 rounded-lg shrink-0 ${
                        selectedCategory === c.id ? THEME.vault : 'bg-white border border-amber-200 text-slate-700'
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('category-pills');
                    if (el) el.scrollBy({ left: 160, behavior: 'smooth' });
                  }}
                  className={`w-7 h-7 rounded-lg ${THEME.vault} flex items-center justify-center shrink-0 font-black text-xs`}
                >
                  ▶
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setMenuSubMode('tiles')}
                    className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      menuSubMode === 'tiles' ? THEME.lime : THEME.frost
                    }`}
                  >
                    Плитка
                  </button>
                  <button
                    onClick={() => setMenuSubMode('week')}
                    className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      menuSubMode === 'week' ? THEME.lime : THEME.frost
                    }`}
                  >
                    Неделя
                  </button>
                </div>
              </div>

              {menuSubMode === 'tiles' ? (
                <div>
                  {selectedCategory === 'all' && (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {VISUAL_CATEGORIES.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCategory(c.id)}
                          className="relative h-28 sm:h-32 rounded-xl overflow-hidden cursor-pointer border border-amber-100 shadow-sm group"
                        >
                          <img
                            src={c.img}
                            alt={c.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2 text-white">
                            <span className="font-black text-xs tracking-tight block leading-snug">
                              {c.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`${THEME.vault} font-black text-xs py-2 px-3 flex flex-wrap items-center justify-between gap-1.5`}
                  >
                    <span>
                      {selectedCategory === 'all'
                        ? `⭐ Мои рецепты DEEV (4–5★ — найдено: ${filteredRecipes.length})`
                        : `📂 ${selectedCategory}`}
                    </span>
                    <button
                      onClick={() => setOnlyHighRated(prev => !prev)}
                      className="text-[10px] font-black bg-white/90 px-2 py-0.5 rounded-lg shadow-sm"
                    >
                      {onlyHighRated ? 'Все оценки (1–5★)' : 'Только 4–5★'}
                    </button>
                  </div>

                  {/* Strictly 2 compact tiles per row */}
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {filteredRecipes.map(r => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setActiveRecipe(r);
                          setTimerSeconds((r.time || 15) * 60);
                          setTimerRunning(false);
                        }}
                        className="relative h-32 sm:h-36 rounded-xl overflow-hidden cursor-pointer border border-amber-100 shadow-sm group"
                      >
                        <img
                          src={r.img}
                          alt={r.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-white/95 text-slate-900 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                          ⏱ {r.time}м • 🔥 {r.kcal}
                        </span>
                        <div className="absolute top-1.5 right-1.5 bg-slate-900/85 px-1 py-0.2 rounded text-[10px] text-amber-400 flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span
                              key={star}
                              onClick={e => setRecipeRating(r.id, star, e)}
                              className={`cursor-pointer ${
                                star <= getRecipeRating(r.id) ? 'text-amber-400' : 'text-slate-500'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-2 text-white">
                          <span className="text-[8px] text-amber-300 font-black uppercase block">
                            {r.cat} • {getRecipeRating(r.id)}★
                          </span>
                          <h3 className="font-bold text-[11px] leading-snug line-clamp-2">{r.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 space-y-2.5">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    {DAYS_OF_WEEK.map((d, idx) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg font-black text-[11px] shrink-0 ${
                          idx === selectedDayIdx ? THEME.vault : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { slot: 'Завтрак', r: MAIN_RECIPES[1] },
                      { slot: 'Обед', r: MAIN_RECIPES[4] },
                      { slot: 'Ужин', r: MAIN_RECIPES[0] },
                      { slot: 'Перекус', r: MAIN_RECIPES[2] }
                    ].map(meal => (
                      <div
                        key={meal.slot}
                        onClick={() => {
                          setActiveRecipe(meal.r);
                          setTimerSeconds((meal.r.time || 15) * 60);
                        }}
                        className="bg-[#fffdf9] border border-amber-200 rounded-xl overflow-hidden p-1.5 space-y-1 cursor-pointer hover:border-orange-400 transition"
                      >
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${THEME.lime} block w-max`}>
                          {meal.slot} • {meal.r.kcal}
                        </span>
                        <img src={meal.r.img} alt={meal.r.title} className="w-full h-20 object-cover rounded-lg" />
                        <h4 className="font-black text-[11px] line-clamp-2 leading-tight">{meal.r.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: BOMZH-MENU (30 ITEMS, 2 PER ROW) */}
          {currentTab === 'bomzh' && (
            <section className="bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm">
              <div className={`${THEME.fire} p-2.5 flex flex-wrap items-center justify-between gap-1.5`}>
                <div>
                  <h2 className="font-black text-xs uppercase">
                    🔥 Бомж-меню: 30 народных хитов
                  </h2>
                  <p className="text-[10px] font-bold opacity-90">
                    Оценка 4–5★ добавляет блюдо в «Мои рецепты»!
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all', 'Картоха', 'Макарики', 'Крупы', 'Экспресс'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBomzhFilter(cat)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        bomzhFilter === cat ? 'bg-white shadow-sm text-slate-900' : 'bg-white/75'
                      }`}
                    >
                      {cat === 'all' ? 'Все 30' : cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-2">
                {BOMZH_MENU_30.filter(bm => bomzhFilter === 'all' || bm.cat === bomzhFilter).map(bm => (
                  <div
                    key={bm.id}
                    onClick={() => {
                      setActiveRecipe({
                        id: bm.id,
                        cat: `Бомж • ${bm.cat}`,
                        title: bm.title,
                        time: bm.time,
                        kcal: bm.kcal,
                        bju: `Бюджет: ${bm.cost}`,
                        img: BOMZH_IMGS[bm.cat],
                        kidsTip: 'Народный сытный хит из запасов!',
                        ingredients: [
                          'Картоха, Лук и Морковь (4 кг)',
                          'Макарики и Спагетти (3 пачки)',
                          'Тушенка ГОСТ, Томаты и Терияки'
                        ],
                        steps: [bm.desc, 'Запустите таймер со звонком и подавайте горячим!']
                      });
                      setTimerSeconds((bm.time || 15) * 60);
                      setTimerRunning(false);
                    }}
                    className="relative h-32 sm:h-36 rounded-xl overflow-hidden cursor-pointer border border-orange-100 shadow-sm group"
                  >
                    <img
                      src={BOMZH_IMGS[bm.cat]}
                      alt={bm.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-white/95 text-slate-900 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                      {bm.cat} • 🔥 {bm.kcal}
                    </span>
                    <div className="absolute top-1.5 right-1.5 bg-slate-900/80 px-1 py-0.2 rounded text-[10px] text-amber-400 flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          onClick={e => setRecipeRating(bm.id, star, e)}
                          className={star <= getRecipeRating(bm.id) ? 'text-amber-400' : 'text-slate-500'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-2 text-white">
                      <h3 className="font-bold text-[11px] leading-snug line-clamp-2">{bm.title}</h3>
                      <span className="text-[9px] text-amber-300 font-bold">
                        ⏱ {bm.time}м • {bm.cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 3: TREATS (30 ITEMS, 2 PER ROW) */}
          {currentTab === 'treats' && (
            <section className="bg-white border border-pink-200 rounded-2xl overflow-hidden shadow-sm">
              <div className={`${THEME.candy} p-2.5 flex flex-wrap items-center justify-between gap-1.5`}>
                <div>
                  <h2 className="font-black text-xs uppercase">
                    🍬 Вкусняшки DEEV: 30 сладостей
                  </h2>
                  <p className="text-[10px] font-bold opacity-90">
                    Клик добавляет сладость в список покупок!
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all', 'Егор (7)', 'Варя (17)', 'Елена', 'Дмитрий'].map(who => (
                    <button
                      key={who}
                      onClick={() => setTreatsFilter(who)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        treatsFilter === who ? 'bg-white shadow-sm' : 'bg-white/75'
                      }`}
                    >
                      {who === 'all' ? 'Все' : who.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-2">
                {TREATS_30.filter(t => treatsFilter === 'all' || t.forWho === treatsFilter).map(t => (
                  <div
                    key={t.id}
                    onClick={() => addSmartBuyItem(t.title, '1 уп', t.price, t.store, `Вкусняшка (${t.forWho})`)}
                    className="relative h-32 sm:h-36 rounded-xl overflow-hidden cursor-pointer border border-pink-100 shadow-sm group"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=600&q=80"
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className={`absolute top-1.5 left-1.5 ${THEME.candy} text-[9px] font-black px-1.5 py-0.2 rounded`}>
                      ❤️ {t.forWho}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-2 text-white">
                      <h3 className="font-bold text-[11px] leading-snug line-clamp-2">{t.title}</h3>
                      <span className="text-[9px] text-lime-300 font-black block mt-0.5">
                        ~{t.price} ₽ • {t.store.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: GAS STATION HIGHWAY FOOD (2 PER ROW) */}
          {currentTab === 'gas' && (
            <section className="bg-white border-2 border-yellow-300 rounded-2xl overflow-hidden shadow-sm">
              <div className={`${THEME.gas} p-2.5 flex flex-wrap items-center justify-between gap-1.5`}>
                <div>
                  <h2 className="font-black text-xs uppercase">
                    ⛽ Поесть на заправке: Фри, Бургеры, Кофе
                  </h2>
                  <p className="text-[10px] font-bold opacity-90">
                    Клик сразу записывает чек АЗС в расходы дня!
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all', 'Бургеры и Хот-доги', 'Фри и Наггетсы', 'Кофе и Напитки'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGasFilter(cat)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        gasFilter === cat ? 'bg-white shadow-sm' : 'bg-white/75'
                      }`}
                    >
                      {cat === 'all' ? 'Все' : cat.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-2">
                {GAS_STATION_MENU.filter(g => gasFilter === 'all' || g.cat === gasFilter).map(g => (
                  <div
                    key={g.id}
                    onClick={() => {
                      const nowStr = new Date().toLocaleString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      });
                      setPurchaseHistory(prev => [
                        {
                          date: nowStr,
                          isToday: true,
                          item: g.title,
                          store: 'АЗС Трасса (Ямкино 35 км)',
                          mode: '⛽ Поесть на заправке',
                          price: g.price,
                          photo: null
                        },
                        ...prev
                      ]);
                      triggerToast(`⛽ Чек АЗС: «${g.title}» (${g.price} ₽) записан!`);
                    }}
                    className="relative h-32 sm:h-36 rounded-xl overflow-hidden cursor-pointer border border-yellow-200 shadow-sm group"
                  >
                    <img
                      src={g.img}
                      alt={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className={`absolute top-1.5 left-1.5 ${THEME.gas} text-[9px] font-black px-1.5 py-0.2 rounded`}>
                      ⛽ {g.price} ₽
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-2 text-white">
                      <span className="text-[8px] text-yellow-300 font-black block">{g.who}</span>
                      <h3 className="font-bold text-[11px] leading-snug line-clamp-2">{g.title}</h3>
                      <span className="text-[9px] text-lime-300 font-black block mt-0.5">Клик &rarr; В чеки дня</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 5: SHOPPING LIST */}
          {currentTab === 'shopping' && (
            <section className="space-y-2.5">
              {/* Shopping List with Auto-Pricing */}
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-1.5">
                  <div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${THEME.market}`}>
                      Автоцены
                    </span>
                    <h2 className="font-black text-sm text-slate-900 mt-0.5">
                      🛒 Нужно купить (Ямкино / Рынок / Глобус)
                    </h2>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCameraModalOpen(true)}
                      className={`${THEME.lime} text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1`}
                    >
                      <Camera className="w-3 h-3" /> Чек AI
                    </button>
                    <button
                      onClick={() => setShareModalOpen(true)}
                      className={`${THEME.galaxy} text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1`}
                    >
                      <Share2 className="w-3 h-3" /> Скинуть
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 space-y-1.5">
                  <input
                    value={buyNameInp}
                    onChange={e => {
                      const val = e.target.value;
                      setBuyNameInp(val);
                      for (const [key, info] of Object.entries(AUTO_PRICE_DB)) {
                        if (val.toLowerCase().includes(key)) {
                          setBuyUnitInp(info.unit);
                          setBuyPriceInp(info.price);
                          break;
                        }
                      }
                    }}
                    type="text"
                    placeholder="Что купить? (напр., Мясо в Глобусе, Яблоки)..."
                    className="w-full bg-white border border-emerald-300 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5"
                  />
                  <div className="flex gap-1.5">
                    <input
                      value={buyUnitInp}
                      onChange={e => setBuyUnitInp(e.target.value)}
                      type="text"
                      placeholder="Сколько"
                      className="w-24 bg-white border border-emerald-300 text-slate-800 text-xs font-bold rounded-xl px-2 py-1.5"
                    />
                    <input
                      value={buyPriceInp}
                      onChange={e => setBuyPriceInp(Number(e.target.value) || 0)}
                      type="number"
                      placeholder="Цена ₽"
                      className="w-20 bg-white border border-emerald-300 text-emerald-800 text-xs font-black rounded-xl px-2 py-1.5"
                    />
                    <button
                      onClick={() => {
                        if (!buyNameInp.trim()) return;
                        addSmartBuyItem(buyNameInp, buyUnitInp, buyPriceInp);
                        setBuyNameInp('');
                        setBuyUnitInp('1 уп');
                        setBuyPriceInp(150);
                      }}
                      className={`w-full ${THEME.market} text-xs font-black py-1.5 rounded-xl`}
                    >
                      + Добавить
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {customToBuy.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#fff9fb] border-2 border-pink-200 flex items-center justify-between gap-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${THEME.candy}`}>
                          {item.who}
                        </span>
                        <h4 className="font-black text-xs text-slate-900 mt-0.5 truncate">
                          {item.name} <span className="text-emerald-700 font-bold">({item.unit})</span>{' '}
                          {item.qty > 1 && <span className="text-rose-600">x{item.qty}</span>}
                        </h4>
                        <p className="text-[10px] text-slate-600 truncate">
                          📍 {item.store} • <strong>~{item.price * (item.qty || 1)} ₽</strong>
                        </p>
                      </div>
                      <div className="flex gap-1 items-center shrink-0">
                        <button
                          onClick={() => {
                            const nowStr = new Date().toLocaleString('ru-RU', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            setPurchaseHistory(prev => [
                              {
                                date: nowStr,
                                isToday: true,
                                item: `${item.name} (${item.unit}) ${item.qty > 1 ? `x${item.qty}` : ''}`,
                                store: item.store,
                                mode: '🛒 Офлайн закупка',
                                price: item.price * (item.qty || 1),
                                photo: null
                              },
                              ...prev
                            ]);
                            setCustomFridgeItems(prev => [
                              { name: `${item.name} (${item.unit})`, cat: '❄️ В холодос' },
                              ...prev
                            ]);
                            const copy = [...customToBuy];
                            copy.splice(idx, 1);
                            setCustomToBuy(copy);
                            triggerToast(`Куплено и положено в холодос: ${item.name}!`);
                          }}
                          className={`${THEME.market} text-[10px] font-black px-2 py-1 rounded-lg`}
                        >
                          Купил
                        </button>
                        <button
                          onClick={() => {
                            const copy = [...customToBuy];
                            copy.splice(idx, 1);
                            setCustomToBuy(copy);
                          }}
                          className={`${THEME.candy} text-[10px] font-black px-1.5 py-1 rounded-lg`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {PRODUCT_MINIMUM.filter(p => stockStatus[p.id] === 'out').map(p => {
                    const minPr = Math.min(...Object.values(p.prices));
                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-[#f7fee7]/50 border-2 border-lime-200 flex items-center justify-between gap-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-[8px] font-black text-amber-800 uppercase">
                            Минимум 100% • {p.norm}
                          </span>
                          <h4 className="font-black text-xs text-slate-900 truncate">{p.name}</h4>
                          <p className="text-[10px] text-emerald-800 font-bold truncate">
                            📍 {p.bestStore} (от {minPr} ₽)
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setStockStatus(prev => ({ ...prev, [p.id]: 'home' }));
                            const nowStr = new Date().toLocaleString('ru-RU', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            setPurchaseHistory(prev => [
                              {
                                date: nowStr,
                                isToday: true,
                                item: p.name,
                                store: p.bestStore,
                                mode: '🛒 Офлайн закупка',
                                price: minPr,
                                photo: null
                              },
                              ...prev
                            ]);
                            triggerToast(`Куплено и пополнено: ${p.name}!`);
                          }}
                          className={`${THEME.market} text-[10px] font-black px-2 py-1 rounded-lg shrink-0`}
                        >
                          Купил
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 6. RECIPE DETAIL MODAL */}
        {activeRecipe && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white text-slate-900 w-full max-w-lg max-h-[92vh] rounded-3xl overflow-y-auto flex flex-col shadow-2xl border-2 border-amber-200">
              <div className="bg-[#faf7f2] border-b border-amber-200 px-3 py-2 flex items-center justify-between sticky top-0 z-20">
                <button
                  onClick={() => setActiveRecipe(null)}
                  className={`${THEME.vault} px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-black`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Назад
                </button>
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl border border-amber-200">
                  <span className="text-[9px] font-black text-slate-500 mr-0.5">Оценка:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRecipeRating(activeRecipe.id, star)}
                      className={`text-base leading-none ${
                        star <= getRecipeRating(activeRecipe.id) ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full h-48 bg-slate-200 shrink-0">
                <img src={activeRecipe.img} alt={activeRecipe.title} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 pt-8 text-white">
                  <h3 className="font-black text-sm sm:text-base leading-snug mb-1">{activeRecipe.title}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="bg-lime-500 text-slate-950 px-2 py-0.5 rounded-lg font-black text-[10px]">
                      ⏱ {activeRecipe.time} мин • 🔥 {activeRecipe.kcal} ккал
                    </span>
                    <button
                      onClick={() => {
                        const txt = encodeURIComponent(
                          `Готовим в DEEV: ${activeRecipe.title}! Оценка: ${getRecipeRating(activeRecipe.id)}/5 ★`
                        );
                        window.open(`https://t.me/share/url?url=DEEV&text=${txt}`, '_blank');
                      }}
                      className={`${THEME.galaxy} px-2.5 py-0.5 rounded-lg font-black text-[10px] flex items-center gap-1`}
                    >
                      <Share2 className="w-3 h-3" /> Скинуть
                    </button>
                  </div>
                </div>
              </div>

              {/* Cooking Timer with Bell */}
              <div className="bg-amber-50 border-y border-amber-200 px-3 py-2 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${THEME.fire} flex items-center justify-center text-sm font-black`}>
                    ⏰
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-amber-900 block">Таймер блюда</span>
                    <strong className="text-base font-black text-slate-900">
                      {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                      {String(timerSeconds % 60).padStart(2, '0')}
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => setTimerRunning(prev => !prev)}
                    className={`${THEME.lime} text-xs font-black px-2.5 py-1 rounded-xl`}
                  >
                    {timerRunning ? '⏸ Пауза' : '▶ Старт'}
                  </button>
                  <button
                    onClick={() => setTimerSeconds(prev => prev + 60)}
                    className={`${THEME.vault} text-xs font-black px-1.5 py-1 rounded-xl`}
                  >
                    +1м
                  </button>
                  <button
                    onClick={() => setTimerSeconds(prev => prev + 300)}
                    className={`${THEME.vault} text-xs font-black px-1.5 py-1 rounded-xl`}
                  >
                    +5м
                  </button>
                  <button
                    onClick={playKitchenBell}
                    className={`${THEME.frost} text-xs font-black px-2 py-1 rounded-xl`}
                  >
                    🔔 Звонок
                  </button>
                </div>
              </div>

              {/* Lime Tabs */}
              <div className="grid grid-cols-2 bg-lime-600 text-white font-extrabold text-xs shrink-0">
                <button
                  onClick={() => setRecipeModalTab('instructions')}
                  className={`py-2 text-center border-b-2 transition ${
                    recipeModalTab === 'instructions'
                      ? 'bg-lime-700 border-yellow-200'
                      : 'border-transparent opacity-90'
                  }`}
                >
                  Инструкция
                </button>
                <button
                  onClick={() => setRecipeModalTab('ingredients')}
                  className={`py-2 text-center border-b-2 transition ${
                    recipeModalTab === 'ingredients'
                      ? 'bg-lime-700 border-yellow-200'
                      : 'border-transparent opacity-90'
                  }`}
                >
                  Ингредиенты
                </button>
              </div>

              {recipeModalTab === 'instructions' ? (
                <div className="p-3 space-y-2 bg-white flex-1 text-xs text-slate-800">
                  {activeRecipe.steps.map((step, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-amber-50/50 border border-amber-100 font-medium">
                      <strong className="text-orange-700">{idx + 1}.</strong> {step}
                    </div>
                  ))}
                  <div className={`${THEME.vault} p-2.5 rounded-2xl text-[11px] mt-1 font-semibold`}>
                    👨‍👩‍👧‍👦 Совет семьи DEEV: {activeRecipe.kidsTip}
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2 bg-white flex-1 text-xs text-slate-800">
                  <ul className="divide-y divide-slate-100 text-xs">
                    {activeRecipe.ingredients.map((ing, idx) => {
                      const matchedMin = PRODUCT_MINIMUM.find(p => p.name === ing);
                      const isHome = matchedMin ? stockStatus[matchedMin.id] !== 'out' : true;
                      return (
                        <li key={idx} className="py-1.5 flex items-center justify-between gap-2">
                          <span className="font-bold text-[11px]">{ing}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              isHome ? THEME.market : THEME.candy
                            }`}
                          >
                            {isHome ? '✅ Дома' : '🛒 В магаз'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    onClick={() => {
                      activeRecipe.ingredients.forEach(ing => {
                        const m = PRODUCT_MINIMUM.find(p => p.name === ing);
                        if (m) setStockStatus(prev => ({ ...prev, [m.id]: 'out' }));
                      });
                      triggerToast('Недостающие продукты перенесены в «Нужно купить»!');
                      setActiveRecipe(null);
                      setCurrentTab('shopping');
                    }}
                    className={`w-full ${THEME.market} font-black text-xs py-2.5 rounded-2xl`}
                  >
                    🛒 Отправить недостающее в «Нужно купить»
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. MULTIMODAL GEMINI RECEIPT OCR CAMERA MODAL */}
        {cameraModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3">
            <div className="bg-[#fffdf9] border-2 border-indigo-300 w-full max-w-md rounded-3xl p-4 space-y-2.5 shadow-2xl max-h-[94vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${THEME.galaxy}`}>
                    Мультимодальный Gemini OCR
                  </span>
                  <h3 className="font-black text-sm text-slate-900 mt-0.5">
                    📸 Распознать чек и пополнить холодос
                  </h3>
                </div>
                <button
                  onClick={() => setCameraModalOpen(false)}
                  className={`w-7 h-7 rounded-full ${THEME.candy} flex items-center justify-center`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-indigo-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {capturedPhoto && !cameraActive && (
                  <img src={capturedPhoto} alt="Превью чека" className="w-full h-full object-contain" />
                )}
                {!cameraActive && !capturedPhoto && (
                  <div className="text-center p-3 text-xs text-slate-300 space-y-1.5">
                    <ScanLine className="w-8 h-8 text-indigo-400 mx-auto block" />
                    <p className="text-[11px]">Включите камеру или протестируйте чек Глобуса</p>
                  </div>
                )}

                {isAnalyzingReceipt && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white p-3 space-y-2 text-center">
                    <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
                    <span className="text-xs font-black text-lime-300">
                      Gemini извлекает продукты и пополняет холодос...
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={startLiveCamera} className={`${THEME.frost} font-black text-xs py-2 rounded-xl`}>
                  🎥 Камера
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraActive || isAnalyzingReceipt}
                  className={`${THEME.lime} font-black text-xs py-2 rounded-xl disabled:opacity-50`}
                >
                  📸 Сфоткать
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <label className={`block w-full text-center ${THEME.vault} font-black text-xs py-2 rounded-xl cursor-pointer`}>
                  📱 Фото с телефона
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={simulateSampleReceiptScan}
                  disabled={isAnalyzingReceipt}
                  className={`${THEME.galaxy} font-black text-xs py-2 rounded-xl flex items-center justify-center gap-1`}
                >
                  <Sparkles className="w-3 h-3" /> Тест: Чек Глобуса
                </button>
              </div>

              {recognizedReceiptItems.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2 space-y-1">
                  <span className="text-[10px] font-black text-emerald-900 block">
                    Распознано и добавлено в холодос ({recognizedReceiptItems.length} поз.):
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px]">
                    {recognizedReceiptItems.map((it, idx) => (
                      <div key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-200 flex justify-between">
                        <span>{it.category} <strong>{it.name}</strong></span>
                        <span className="font-black text-emerald-700">{it.price} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <input
                  value={camReceiptTitle}
                  onChange={e => setCamReceiptTitle(e.target.value)}
                  type="text"
                  placeholder="Описание покупки..."
                  className="w-full bg-white border border-indigo-200 text-xs rounded-xl px-2.5 py-1.5 font-bold"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={camReceiptPrice}
                    onChange={e => setCamReceiptPrice(Number(e.target.value) || 0)}
                    type="number"
                    placeholder="Сумма ₽"
                    className="w-full bg-white border border-indigo-200 text-xs rounded-xl px-2.5 py-1.5 font-black text-emerald-800"
                  />
                  <input
                    value={camReceiptStore}
                    onChange={e => setCamReceiptStore(e.target.value)}
                    type="text"
                    placeholder="Магазин"
                    className="w-full bg-white border border-indigo-200 text-xs font-bold rounded-xl px-2 py-1.5 text-slate-700"
                  />
                </div>
                <button
                  onClick={savePhotoReceipt}
                  disabled={isAnalyzingReceipt}
                  className={`w-full ${THEME.market} font-black text-xs py-2.5 rounded-xl shadow`}
                >
                  💾 Сохранить чек в бюджет и пополнить холодос
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. SHARE MODAL */}
        {shareModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#fffdf9] border-2 border-indigo-200 w-full max-w-lg rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${THEME.galaxy}`}>
                    Синхронизация DEEV
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 mt-0.5">
                    Елена написала &rarr; Дмитрий купил
                  </h3>
                </div>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className={`w-7 h-7 rounded-full ${THEME.candy} flex items-center justify-center`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                readOnly
                rows={6}
                value={`🛒 СПИСОК ПОКУПОК DEEV:\n\n${customToBuy
                  .map(c => `• ${c.name} [${c.unit}] ${c.qty > 1 ? `x${c.qty}` : ''} (~${c.price * (c.qty || 1)}₽) — ${c.store}`)
                  .join('\n')}\n${PRODUCT_MINIMUM.filter(p => stockStatus[p.id] === 'out')
                  .map(p => `• ${p.name} [${p.norm}] — ${p.bestStore}`)
                  .join('\n')}`}
                className="w-full bg-white border border-indigo-200 rounded-2xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `🛒 СПИСОК DEEV:\n${customToBuy.map(c => `• ${c.name} (${c.unit}) — ${c.store}`).join('\n')}`
                    );
                    triggerToast('Список скопирован!');
                  }}
                  className={`${THEME.lime} font-black text-xs py-2.5 rounded-xl`}
                >
                  Скопировать
                </button>
                <button
                  onClick={() => {
                    const txt = encodeURIComponent(
                      `🛒 СПИСОК DEEV:\n${customToBuy.map(c => `• ${c.name} (${c.unit})`).join('\n')}`
                    );
                    window.open(`https://t.me/share/url?url=DEEV&text=${txt}`, '_blank');
                  }}
                  className={`${THEME.frost} font-black text-xs py-2.5 rounded-xl`}
                >
                  В Telegram
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. SETTINGS & AI FAQ MODAL */}
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#fffdf9] border-2 border-lime-300 w-full max-w-lg rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${THEME.lime}`}>
                    Шпаргалка + Gemini AI
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 mt-0.5">
                    🤔 Какого рода вопросики писать?
                  </h3>
                </div>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className={`w-7 h-7 rounded-full ${THEME.candy} flex items-center justify-center`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-2.5 text-xs space-y-1 text-slate-700">
                <p><strong>1. Любой рецепт:</strong> <em>«рецепт омлета», «как пожарить сырники»</em></p>
                <p><strong>2. Ревизия холодоса:</strong> <em>«что приготовить из холодоса?»</em></p>
                <p><strong>3. Советы по ценам:</strong> <em>«где дешевле мясо в Ямкино и Глобусе?»</em></p>
                <p><strong>4. Быстрая покупка:</strong> <em>«купить молоко и чупики»</em></p>
              </div>

              <div className="flex gap-1.5">
                <input
                  id="modal-gemini-q"
                  type="text"
                  placeholder="Напишите вопросик..."
                  className="w-full bg-white border border-lime-300 text-xs rounded-xl px-2.5 py-2"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = (e.target as HTMLInputElement).value;
                      handleAiAsk(v);
                      setSettingsModalOpen(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('modal-gemini-q') as HTMLInputElement;
                    if (el && el.value) {
                      handleAiAsk(el.value);
                      setSettingsModalOpen(false);
                    }
                  }}
                  className={`${THEME.lime} text-xs font-black px-3 rounded-xl shrink-0`}
                >
                  Спросить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10. PHOTO VIEWER MODAL */}
        {photoViewerImg && (
          <div
            onClick={() => setPhotoViewerImg(null)}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3"
          >
            <div className="bg-white p-2.5 rounded-2xl max-w-sm w-full space-y-2 text-center" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-1">
                <strong className="text-xs font-black text-slate-800 truncate">{photoViewerImg.title}</strong>
                <button
                  onClick={() => setPhotoViewerImg(null)}
                  className={`w-6 h-6 rounded-full ${THEME.candy} font-black text-xs shrink-0 ml-1`}
                >
                  ×
                </button>
              </div>
              <img
                src={photoViewerImg.url}
                alt="Чек"
                className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-200"
              />
            </div>
          </div>
        )}

        {/* 11. FIXED BOTTOM NAVIGATION BAR - FIRMLY AT BOTTOM OF SCREEN IN PHONE SIMULATOR! */}
        <nav
          className={`fixed bottom-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-t border-amber-200/80 px-2 py-2 shadow-2xl ${
            mobileSimulator ? 'max-w-[420px] left-1/2 -translate-x-1/2 rounded-b-[38px] sm:rounded-b-[42px]' : 'inset-x-0'
          }`}
        >
          <div className="max-w-xl mx-auto grid grid-cols-6 gap-1 text-center">
            <button
              onClick={() => setCurrentTab('menu')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight transition ${
                currentTab === 'menu' ? `${THEME.lime} ring-2 ring-lime-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 mb-0.5" /> Рецепты
            </button>
            <button
              onClick={() => togglePanel('fridge')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight transition ${
                activePanel === 'fridge' ? `${THEME.frost} ring-2 ring-sky-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 mb-0.5" /> Холодос
            </button>
            <button
              onClick={() => setCurrentTab('bomzh')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight transition ${
                currentTab === 'bomzh' ? `${THEME.fire} ring-2 ring-orange-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mb-0.5" /> Бомж
            </button>
            <button
              onClick={() => setCurrentTab('treats')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight transition ${
                currentTab === 'treats' ? `${THEME.candy} ring-2 ring-pink-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <Candy className="w-3.5 h-3.5 mb-0.5" /> Вкусно
            </button>
            <button
              onClick={() => setCurrentTab('gas')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight transition ${
                currentTab === 'gas' ? `${THEME.gas} ring-2 ring-yellow-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 mb-0.5" /> АЗС
            </button>
            <button
              onClick={() => setCurrentTab('shopping')}
              className={`flex flex-col items-center py-1.5 rounded-xl font-black text-[9px] sm:text-[10px] leading-tight relative transition ${
                currentTab === 'shopping' ? `${THEME.market} ring-2 ring-emerald-400` : 'bg-white/80 text-slate-700'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 mb-0.5" /> В магазе
              {totalBuyBadge > 0 && (
                <span className="absolute -top-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1 py-0.1 rounded-full shadow">
                  {totalBuyBadge}
                </span>
              )}
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
