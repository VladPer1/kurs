import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Database,
  Lock,
  FileCode2,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  CreditCard,
  BookOpen,
  Activity,
  Copy,
  Terminal,
  RefreshCw,
  Eye,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';

interface AuthRoleData {
  id?: string;
  name: string;
  description?: string;
  permissions?: string[];
}

interface AuthUserData {
  id: string;
  email: string;
  full_name: string;
  role: string | AuthRoleData;
  permissions?: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'security' | 'swagger' | 'postman'>('overview');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserData | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Playground state
  const [endpointUrl, setEndpointUrl] = useState<string>('/api/v1/courses');
  const [endpointMethod, setEndpointMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [requestBody, setRequestBody] = useState<string>('{\n  "title": "Новый интенсив по SecOps",\n  "description": "Практика аудита и защита инфраструктуры",\n  "price": 19500,\n  "start_date": "2026-11-15T10:00:00Z",\n  "max_seats": 20\n}');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

  // Security test states
  const [bruteForceEmail, setBruteForceEmail] = useState('student@course-platform.local');
  const [bruteForceLogs, setBruteForceLogs] = useState<string[]>([]);
  const [isBruteTesting, setIsBruteTesting] = useState(false);

  // Card encryption test states
  const [testCardNumber, setTestCardNumber] = useState('4242424242424242');
  const [testCardHolder, setTestCardHolder] = useState('IVAN PETROV');
  const [testCardCvv, setTestCardCvv] = useState('789');
  const [cardSaveResult, setCardSaveResult] = useState<any>(null);

  useEffect(() => {
    fetchHealthAndMetrics();
    const interval = setInterval(fetchHealthAndMetrics, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthAndMetrics = async () => {
    try {
      const hRes = await fetch('/api/v1/system/health');
      if (hRes.ok) {
        const hData = await hRes.json();
        setSystemHealth(hData);
      }
      const mRes = await fetch('/api/v1/system/metrics');
      if (mRes.ok) {
        const mData = await mRes.json();
        setMetrics(mData);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleLoginPreset = async (email: string, password: string) => {
    setApiLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setResponseStatus(res.status);
      setApiResponse(data);
      const token = data.data?.access_token || data.data?.accessToken;
      if (res.ok && token) {
        setAccessToken(token);
        setCurrentUser(data.data.user);
      }
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  const handleExecuteRequest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const options: RequestInit = {
        method: endpointMethod,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpointMethod) && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(endpointUrl, options);
      setResponseStatus(res.status);
      const data = await res.json();
      setApiResponse(data);
    } catch (err: any) {
      setApiResponse({ error: err.message });
      setResponseStatus(500);
    } finally {
      setApiLoading(false);
      fetchHealthAndMetrics();
    }
  };

  const runBruteForceTest = async () => {
    setIsBruteTesting(true);
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] Запуск OWASP теста на подбор паролей (Цель: ${bruteForceEmail})...`);
    setBruteForceLogs([...logs]);

    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: bruteForceEmail, password: `WrongPassAttempt_${i}` }),
        });
        const data = await res.json();
        if (res.status === 423) {
          logs.push(`⚠️ Попытка #${i}: HTTP 423 LOCKED! Аккаунт заблокирован на 15 минут. Ответ: ${data.error?.message}`);
        } else if (res.status === 401) {
          logs.push(`❌ Попытка #${i}: HTTP 401 Unauthorized. Осталось попыток: ${data.error?.attemptsLeft}`);
        } else {
          logs.push(`ℹ️ Попытка #${i}: HTTP ${res.status} ${JSON.stringify(data.error || data)}`);
        }
      } catch (err: any) {
        logs.push(`Ошибка сетевого запроса: ${err.message}`);
      }
      setBruteForceLogs([...logs]);
    }
    setIsBruteTesting(false);
    fetchHealthAndMetrics();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Course & Training Management API
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ИПР №1: Безопасный REST API
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Динамический RBAC • JWT httpOnly • Брутфорс-лок • AES-256-GCM • OWASP Top 10
            </p>
          </div>
        </div>

        {/* Live Server Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.status === 'UP' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className="text-slate-300">БД & Сервер:</span>
            <span className="font-semibold text-emerald-400">{systemHealth?.status === 'UP' ? 'В сети (200 OK)' : 'Проверка...'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300">Запросов:</span>
            <span className="font-mono font-semibold text-indigo-300">{metrics?.totalRequestsServed ?? 0}</span>
          </div>

          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Swagger UI (/api/docs)</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <a
            href="/api/postman-collection"
            download="course_management_api.json"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Postman JSON</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-2 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Обзор архитектуры & Спецификация</span>
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 px-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'playground'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>2. Интерактивный API Playground & RBAC</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>3. Тесты мер безопасности (OWASP + 4 меры)</span>
          </button>
          <button
            onClick={() => setActiveTab('swagger')}
            className={`pb-3 px-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'swagger'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>4. OpenAPI / Swagger 3.0</span>
          </button>
          <button
            onClick={() => setActiveTab('postman')}
            className={`pb-3 px-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'postman'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>5. Postman-коллекция & Git ветка ipr21</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ARCHITECTURE */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Hero Card */}
            <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Курсовой проект: «Система для записи на курсы и тренинги с оплатой и личным кабинетом»
                  </h2>
                  <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
                    Этап: <strong>Фаза 1 (ИПР №1 — Безопасный REST API)</strong>. Реализована полная схема реляционной БД в Sequelize, динамическая матрица прав доступа (RBAC), шифрование банковских карт AES-256-GCM, комплексная защита OWASP и автотесты.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                    Ветка сдачи: git checkout ipr21
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Security Pillars Required by ИПР №1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <Key className="w-4 h-4" />
                  <span>Пункт 5: JWT в httpOnly Cookies</span>
                </div>
                <p className="text-xs text-slate-400">
                  Access-токен (15 мин) передается в теле и заголовке Authorization: Bearer, Refresh-токен (7 дн) защищен параметрами httpOnly, Secure, SameSite=Strict для защиты от XSS.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Пункт 6: Anti-Bruteforce Lock</span>
                </div>
                <p className="text-xs text-slate-400">
                  5 неудачных попыток ввода пароля приводят к временной блокировке аккаунта на 15 минут (поле lock_until в БД). Все инциденты фиксируются в журнале безопасности.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <CreditCard className="w-4 h-4" />
                  <span>Пункт 14: AES-256-GCM Шифрование</span>
                </div>
                <p className="text-xs text-slate-400">
                  Полный номер банковской карты и CVV шифруются в таблице payment_methods алгоритмом AES-256-GCM с уникальным IV. В API возвращаются только безопасные last4 цифры.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Пункт 24: Generic Errors</span>
                </div>
                <p className="text-xs text-slate-400">
                  В продакшене стектрейсы и детали SQL исключений скрыты. Клиенту возвращаются только стандартизированные коды ошибок с аудитом на сервере.
                </p>
              </div>
            </div>

            {/* Architecture Schema & Database Entities */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white">Реализованная схема базы данных (9 моделей Sequelize)</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">PostgreSQL / SQLite Compatible</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-2 flex items-center justify-between">
                    <span>1. Подсистема прав (RBAC)</span>
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• <span className="text-emerald-400">roles</span> (id, name, description)</li>
                    <li>• <span className="text-emerald-400">permissions</span> (id, slug, description)</li>
                    <li>• <span className="text-emerald-400">role_permissions</span> (role_id, permission_id)</li>
                  </ul>
                  <div className="mt-2 text-slate-500 text-[11px] font-sans">
                    Динамическая привязка прав без хардкода ролей в коде.
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-2 flex items-center justify-between">
                    <span>2. Пользователи и Каталог</span>
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• <span className="text-emerald-400">users</span> (role_id, email, hash, lock_until)</li>
                    <li>• <span className="text-emerald-400">instructors</span> (user_id, bio, rating)</li>
                    <li>• <span className="text-emerald-400">courses</span> (instructor_id, price, seats)</li>
                  </ul>
                  <div className="mt-2 text-slate-500 text-[11px] font-sans">
                    Хэширование bcrypt salt &gt;= 10, счетчик попыток входа.
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-2 flex items-center justify-between">
                    <span>3. Записи, Карты и Платежи</span>
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• <span className="text-emerald-400">enrollments</span> (user_id, course_id, status)</li>
                    <li>• <span className="text-emerald-400">payment_methods</span> (last4, AES payload)</li>
                    <li>• <span className="text-emerald-400">payments</span> (amount, tx_ref, paid_at)</li>
                  </ul>
                  <div className="mt-2 text-slate-500 text-[11px] font-sans">
                    ACID-транзакции при резервировании мест и оплате.
                  </div>
                </div>
              </div>
            </div>

            {/* Test Accounts Ready to Use */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Предустановленные тестовые аккаунты (Seed Data)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ADMIN (Полные права)
                    </span>
                    <div className="mt-2 font-mono text-slate-200">admin@course-platform.local</div>
                    <div className="font-mono text-slate-400">AdminPassword123!</div>
                  </div>
                  <button
                    onClick={() => handleLoginPreset('admin@course-platform.local', 'AdminPassword123!')}
                    className="mt-3 w-full py-1.5 px-3 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors font-sans text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Войти как Администратор</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      INSTRUCTOR (Преподаватель)
                    </span>
                    <div className="mt-2 font-mono text-slate-200">alex.devops@course-platform.local</div>
                    <div className="font-mono text-slate-400">Instructor123!</div>
                  </div>
                  <button
                    onClick={() => handleLoginPreset('alex.devops@course-platform.local', 'Instructor123!')}
                    className="mt-3 w-full py-1.5 px-3 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 transition-colors font-sans text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Войти как Преподаватель</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      STUDENT (Студент)
                    </span>
                    <div className="mt-2 font-mono text-slate-200">student@course-platform.local</div>
                    <div className="font-mono text-slate-400">StudentPassword123!</div>
                  </div>
                  <button
                    onClick={() => handleLoginPreset('student@course-platform.local', 'StudentPassword123!')}
                    className="mt-3 w-full py-1.5 px-3 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 transition-colors font-sans text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Войти как Студент</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE API PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Request Builder & Auth State */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Authenticated State Banner */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Текущая сессия API</span>
                  {currentUser ? (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Роль: {typeof currentUser.role === 'object' ? currentUser.role.name : currentUser.role}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400">
                      Анонимный запрос
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Пользователь:</span>
                      <span className="font-medium text-slate-200">{currentUser.full_name} ({currentUser.email})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Активные Permissions роли (RBAC):</span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {((typeof currentUser.role === 'object' && currentUser.role.permissions) || currentUser.permissions || []).map((p) => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentUser(null);
                          setAccessToken('');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        Сбросить авторизацию
                      </button>
                      <button
                        onClick={() => copyToClipboard(accessToken, 'token')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedText === 'token' ? 'Скопировано!' : 'Копировать JWT'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => handleLoginPreset('admin@course-platform.local', 'AdminPassword123!')}
                      className="px-2.5 py-1 text-xs rounded bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600/50"
                    >
                      Войти как Admin
                    </button>
                    <button
                      onClick={() => handleLoginPreset('alex.devops@course-platform.local', 'Instructor123!')}
                      className="px-2.5 py-1 text-xs rounded bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/50"
                    >
                      Войти как Instructor
                    </button>
                    <button
                      onClick={() => handleLoginPreset('student@course-platform.local', 'StudentPassword123!')}
                      className="px-2.5 py-1 text-xs rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50"
                    >
                      Войти как Student
                    </button>
                  </div>
                )}
              </div>

              {/* Endpoint Preset Selectors */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Быстрый выбор эндпоинта:
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/courses');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /courses (Каталог)
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/users');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-purple-400 mr-1.5">GET</span> /users (Все с курсами - Admin)
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/instructors/my/students');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-cyan-400 mr-1.5">GET</span> /instructors/my/students
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/payments');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-emerald-400 mr-1.5">GET</span> /payments (Все оплаты - Admin)
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/roles');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /roles (RBAC)
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/cards');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /cards (Карты AES)
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/enrollments/my');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /enrollments/my
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/system/health');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /system/health
                  </button>
                  <button
                    onClick={() => {
                      setEndpointMethod('GET');
                      setEndpointUrl('/api/v1/system/metrics');
                    }}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 text-left border border-slate-800 text-slate-300"
                  >
                    <span className="font-bold text-blue-400 mr-1.5">GET</span> /system/metrics
                  </button>
                </div>
              </div>

              {/* Request Form */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  <select
                    value={endpointMethod}
                    onChange={(e: any) => setEndpointMethod(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="/api/v1/..."
                  />
                  <button
                    onClick={handleExecuteRequest}
                    disabled={apiLoading}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {apiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span>Выполнить</span>
                  </button>
                </div>

                {['POST', 'PUT', 'PATCH'].includes(endpointMethod) && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Тело запроса (JSON):</label>
                    <textarea
                      rows={5}
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Response Viewer */}
            <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ответ сервера (Real-Time API Response)</span>
                {responseStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : responseStatus === 403
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : responseStatus === 423
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
              </div>

              <div className="flex-1 mt-3 rounded-lg bg-slate-950 border border-slate-800/80 p-3 overflow-auto max-h-[500px]">
                {apiLoading ? (
                  <div className="flex items-center justify-center h-48 text-slate-500 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Отправка запроса на бэкенд...</span>
                  </div>
                ) : apiResponse ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs gap-2">
                    <Terminal className="w-6 h-6 text-slate-600" />
                    <span>Выберите эндпоинт и нажмите «Выполнить» для проверки ответа</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY CONTROLS TEST */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Anti-Brute-Force Simulator */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <span>Защита от брутфорса (Пункт 6)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Проверка правила: 5 неудачных попыток ввода пароля блокируют учетную запись на 15 минут.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  HTTP 423 Locked
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={bruteForceEmail}
                  onChange={(e) => setBruteForceEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  placeholder="Email для проверки"
                />
                <button
                  onClick={runBruteForceTest}
                  disabled={isBruteTesting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  {isBruteTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Запустить 6 атак</span>
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 h-52 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5">
                {bruteForceLogs.length === 0 ? (
                  <span className="text-slate-500">Нажмите «Запустить 6 атак» для запуска теста блокировки</span>
                ) : (
                  bruteForceLogs.map((log, idx) => (
                    <div key={idx} className={log.includes('LOCKED') ? 'text-rose-400 font-bold' : ''}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. AES-256 Card Encryption Test */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Шифрование карт AES-256-GCM (Пункт 14)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Номер и CVV шифруются в базе данных ключом из .env. В ответе отдаются только последние 4 цифры.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AES-256-GCM
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Номер карты (16 цифр):</label>
                  <input
                    type="text"
                    value={testCardNumber}
                    onChange={(e) => setTestCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Держатель карты:</label>
                  <input
                    type="text"
                    value={testCardHolder}
                    onChange={(e) => setTestCardHolder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Срок действия:</label>
                  <div className="font-mono text-slate-300 py-1.5">12 / 2028</div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">CVV (Шифруется):</label>
                  <input
                    type="password"
                    maxLength={3}
                    value={testCardCvv}
                    onChange={(e) => setTestCardCvv(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    // First ensure student login if not already
                    let token = accessToken;
                    if (!token) {
                      const lRes = await fetch('/api/v1/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: 'student@course-platform.local', password: 'StudentPassword123!' }),
                      });
                      const lData = await lRes.json();
                      token = lData.data?.access_token || lData.data?.accessToken;
                      setAccessToken(token);
                      setCurrentUser(lData.data?.user);
                    }

                    const res = await fetch('/api/v1/cards', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        card_number: testCardNumber,
                        card_holder: testCardHolder,
                        exp_month: 12,
                        exp_year: 2028,
                        cvv: testCardCvv,
                        is_default: true,
                      }),
                    });
                    const data = await res.json();
                    setCardSaveResult(data);
                  } catch (err: any) {
                    setCardSaveResult({ error: err.message });
                  }
                }}
                className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                Сохранить карту и проверить шифрование
              </button>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 h-32 overflow-y-auto font-mono text-[11px] text-slate-300">
                {cardSaveResult ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(cardSaveResult, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500">
                    Результат API покажет только поле «last4: 4242», а полный номер надежно зашифрован в базе данных.
                  </span>
                )}
              </div>
            </div>

            {/* 3. Dynamic RBAC Authorization Test */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Динамический RBAC Guard (HTTP 403 Forbidden)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Попытка вызова эндпоинта управления ролями <code>GET /api/v1/roles</code> под учетной записью обычного студента без разрешения <code>roles:manage</code>.
              </p>
              <button
                onClick={async () => {
                  setActiveTab('playground');
                  await handleLoginPreset('student@course-platform.local', 'StudentPassword123!');
                  setEndpointMethod('GET');
                  setEndpointUrl('/api/v1/roles');
                }}
                className="py-2 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-medium text-left"
              >
                Проверить отказ в доступе (403 Forbidden) в Playground →
              </button>
            </div>

            {/* 4. OWASP Generic Error Handler Test */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-400" />
                <span>Generic Errors & Санитизация (Пункт 24)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Валидация входных данных блокирует внедрение инъекций и некорректных форматов до попадания в бизнес-логику (HTTP 400 со списком полей).
              </p>
              <button
                onClick={async () => {
                  setActiveTab('playground');
                  setEndpointMethod('POST');
                  setEndpointUrl('/api/v1/auth/register');
                  setRequestBody('{\n  "email": "bad-email",\n  "password": "123",\n  "full_name": ""\n}');
                }}
                className="py-2 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 text-xs font-medium text-left"
              >
                Проверить валидацию невалидного email (400 Bad Request) →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SWAGGER / OPENAPI */}
        {activeTab === 'swagger' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Интерактивная спецификация OpenAPI 3.0 (Swagger)</h3>
                <p className="text-xs text-slate-400">
                  Документация доступна локально по адресу <code>http://localhost:3000/api/docs</code> и в формате raw JSON <code>/api/docs/json</code>.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <span>Открыть в новом окне</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/api/docs/json"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Raw JSON
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-white shadow-xl h-[680px]">
              <iframe
                src="/api/docs"
                title="Swagger UI"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        )}

        {/* TAB 5: POSTMAN & GIT IPR21 */}
        {activeTab === 'postman' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Готовые файлы для сдачи Лабораторной работы №1 (ИПР №1)</h3>
                <p className="text-sm text-slate-300">
                  Коллекция протестирована, содержит скрипты автосохранения токенов и негативные тесты на безопасность.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/postman-collection"
                  download="course_management_api.json"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать Postman Collection JSON</span>
                </a>
              </div>
            </div>

            {/* Checklist of Requirements Met for IPR #1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Чек-лист требований спецификации ИПР №1</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">1. Модели данных и связи:</strong>
                    <div className="text-slate-400 mt-0.5">roles, permissions, role_permissions, users, instructors, courses, enrollments, payment_methods, payments.</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">2. Динамический RBAC:</strong>
                    <div className="text-slate-400 mt-0.5">Middleware hasPermission(slug) без хардкода ролей в контроллерах, эндпоинты динамического назначения прав.</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">3. 4 меры безопасности:</strong>
                    <div className="text-slate-400 mt-0.5">JWT httpOnly cookies, брутфорс-блокировка на 15 мин, AES-256-GCM шифрование карт, generic errors.</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">4. Артефакты сдачи:</strong>
                    <div className="text-slate-400 mt-0.5">Swagger OpenAPI 3.0 (/api/docs) и Postman-коллекция (postman/course_management_api.json).</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Git Branch Commands */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Команды для фиксации в ветку `ipr21` (Лабораторная №1):</span>
              </h4>
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-indigo-300 relative">
                <code>
                  git checkout -b ipr21<br />
                  git add .<br />
                  git commit -m "feat(ipr1): complete secure REST API with dynamic RBAC, AES-256 cards, and Postman collection"<br />
                  git push origin ipr21
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-6 py-4 text-center text-xs text-slate-500">
        Система для записи на курсы и тренинги • Курсовой проект (ИПР №1 + ИПР №2) • 2026
      </footer>
    </div>
  );
}
