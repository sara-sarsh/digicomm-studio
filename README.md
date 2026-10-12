# DigiComm Studio 📡

> **آزمایشگاه تعاملی و مدرن شبیه‌سازی مهندسی مخابرات دیجیتال در مرورگر وب**  
> **Interactive Web-Based Digital Communications Simulation Lab**  
> بر اساس کتاب مرجع *مخابرات دیجیتال* (ویرایش پنجم) اثر جان پروکیس و مسعود صالحی  
> Based on *Digital Communications* (5th Edition) by John G. Proakis & Masoud Salehi.

[![CI](https://github.com/sara-sarsh/digicomm-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/sara-sarsh/digicomm-studio/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/sara-sarsh/digicomm-studio/actions/workflows/pages.yml/badge.svg)](https://github.com/sara-sarsh/digicomm-studio/actions/workflows/pages.yml)
[![Tests](https://img.shields.io/badge/Tests-63%20passed-brightgreen.svg)](https://github.com/sara-sarsh/digicomm-studio)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-purple.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Live Demo:** [https://sara-sarsh.github.io/digicomm-studio/](https://sara-sarsh.github.io/digicomm-studio/)

---

## 📖 بیانیه پروژه / Project Statement

### فارسی
**DigiComm Studio** یک پلتفرم متن‌باز، بدون نیاز به نصب و تعاملی با نرخ ۶۰ فریم بر ثانیه برای یادگیری و آزمایش مفاهیم مهندسی مخابرات دیجیتال است که به صورت کاملاً مستقل درون مرورگر وب اجرا می‌شود. این سیستم با هدف جایگزینی اسکریپت‌های حجیم و سنتی متلب (MATLAB) طراحی شده و به دانشجویان، اساتید و پژوهشگران مهندسی برق و مخابرات اجازه می‌دهد مفاهیم کلیدی نظیر مدولاسیون دیجیتال، شکل‌دهی پالس نایکوئیست، کانال‌های محوشدگی ریلی و رایسی، مالتی‌پلکسینگ چندحاملی OFDM، کدگذاری تصحیح خطا (FEC) و سیستم‌های چندآنتنی MIMO را به‌صورت بصری و در زمان واقعی مشاهده و تحلیل نمایند.

### English
**DigiComm Studio** is an open-source, zero-install, 60 FPS interactive laboratory for digital communications engineering education and research, executing completely client-side in modern web browsers. Designed to supersede heavy, proprietary MATLAB/Simulink workflows, it empowers electrical and computer engineering (ECE) students and researchers to interactively explore, simulate, and analyze core concepts including digital modulation constellations, Nyquist pulse shaping, multipath fading channels, OFDM, forward error correction (FEC), and multi-antenna MIMO systems in real time.

---

## 📚 ماژول‌های آموزشی / Educational Curriculum

| ماژول / Module | مبحث / Topic | شبیه‌سازی / Simulation | مرجع علمی / Reference |
| :--- | :--- | :--- | :--- |
| **۱. مدولاسیون خطی**<br>Linear Modulation | BPSK, QPSK, 16-QAM, 64-QAM (کد گری Gray Coding) | نمودار صورت فلکی زنده (I/Q) و منحنی لگاریتمی BER در برابر SNR | Proakis & Salehi, Ch. 5 |
| **۲. شکل‌دهی پالس**<br>Pulse Shaping | فیلترهای کسینوس وارونه (RC و RRC) با فاکتور غلتش $\alpha$ | پاسخ ضربه، طیف فرکانسی و دیاگرام چشمی بدون تداخل بین‌نمادی (Zero-ISI) | Proakis & Salehi, Ch. 9 |
| **۳. مدولاسیون چندحاملی OFDM**<br>Multicarrier OFDM | تبدیل فوریه سریع Radix-2 (IFFT/FFT)، پیشوند چرخه‌ای (CP) | حذف تداخل ISI چندمسیره، اکولایزر تک‌تپ فرکانسی و نمودار CCDF نسبت PAPR | Proakis & Salehi, Ch. 11 |
| **۴. کانال‌های محوشدگی**<br>Fading Channels | محوشدگی مسطح ریلی (Rayleigh NLOS) و رایسی (Rician LOS) | افت عملکرد در اثر محوشدگی عمیق، اکولایزر Zero-Forcing با برآورد کانال (CSI) | Proakis & Salehi, Ch. 13 |
| **۵. کدگذاری کانال**<br>Channel Coding | کد خطی بلوکی همینگ(7,4) و کد کانولوشن ($R=1/2, K=3$) | تصحیح تک‌خطا با ماتریس سندرم، الگوریتم تصمیم نرم ویتربی و بهره کدگذاری | Proakis & Salehi, Ch. 7 |
| **۶. مخابرات چندآنتنی MIMO**<br>MIMO & Space-Time | کد فضا-زمان آلاموتی ۲×۱ (Alamouti STBC) و ظرفیت شانون | بهره تفکیک‌پذیری مرتبه ۲ (Diversity Gain)، ظرفیت ارگودیک با دترمینان ماتریس | Proakis & Salehi, Ch. 14 |

---

## 📐 فرمول‌های کلیدی / Key Formulas

### ۱. نرخ خطای بیت BPSK در کانال نویز گاوسی (AWGN)
$$P_b = Q\left(\sqrt{\frac{2E_b}{N_0}}\right) = \frac{1}{2} \operatorname{erfc}\left(\sqrt{\frac{E_b}{N_0}}\right)$$

### ۲. نرخ خطای بیت BPSK در کانال محوشدگی ریلی (Rayleigh Fading)
$$P_b = \frac{1}{2} \left(1 - \sqrt{\frac{\gamma_b}{1 + \gamma_b}}\right) \approx \frac{1}{4 \gamma_b} \quad (\gamma_b \gg 1)$$

### ۳. شرط حذف کامل تداخل بین‌نمادی با پیشوند چرخه‌ای در OFDM
$$T_{CP} \geq \tau_{\max} \implies N_{CP} \geq L - 1$$

### ۴. ظرفیت شانون ارگودیک سیستم MIMO ($N_r \times N_t$)
$$C = \log_2 \det \left(\mathbf{I}_{N_r} + \frac{\rho}{N_t} \mathbf{H} \mathbf{H}^H\right) \quad [\text{bits/s/Hz}]$$

### ۵. نرخ خطای بیت کد فضا-زمان آلاموتی ۲×۱ (مرتبه تفکیک‌پذیری $L=2$)
$$P_b \approx \frac{1}{4} (1 - \mu)^2 (2 + \mu), \quad \mu = \sqrt{\frac{\gamma}{1 + \gamma}}$$

---

## ⚡ ویژگی‌های برجسته فنی / Technical Highlights

- **توسعه مبتنی بر وب ورکر (Web Worker):** تمامی محاسبات مونت‌کارلو در پس‌زمینه اجرا شده و هیچ‌گونه تاخیری در رابط کاربری ۶۰ فریم ایجاد نمی‌کند.
- **قانون توقف تطبیقی (Adaptive Stopping):** ثبت حداقل ۵۰ خطا یا سقف ۳ ثانیه برای تضمین دقت آماری با فاصله اطمینان ۹۵٪ ویلسون.
- **تولیدکننده کدهای پایتون و نام‌پای:** با یک کلیک، اسکریپت کامل و مستقل پایتون شامل `numpy`, `scipy.special` و `matplotlib` برای بازتولید شبیه‌سازی دانلود می‌شود.
- **رنگ‌های مدرن OKLCH و طراحی واکنش‌گرا:** رابط کاربری تیره مدرن با رعایت کامل استانداردهای دسترسی‌پذیری و طراحی دوزبانه.

---

## 🛠️ نصب و راه‌اندازی / Getting Started

### پیش‌نیازها
- **Node.js** نسخه ۲۰ یا بالاتر
- **npm** نسخه ۹ یا بالاتر

### مراحل اجرا
```bash
# ۱. کلون کردن ریپازیتوری
git clone https://github.com/sara-sarsh/digicomm-studio.git
cd digicomm-studio

# ۲. نصب وابستگی‌ها
npm install

# ۳. اجرای سرور توسعه محلی
npm run dev

# ۴. باز کردن مرورگر در آدرس:
# http://localhost:5173/digitalcomm/
```

---

## 🧪 اجرای تست‌های خودکار / Running Tests

پروژه با ۶۳ تست واحد و یکپارچگی جامع پوشش داده شده است:

```bash
# اجرای یکباره تمامی تست‌ها (Vitest)
npm test

# اجرای تست‌ها در حالت مشاهده تغییرات (Watch mode)
npm run test:watch

# تولید گزارش پوشش کد (Coverage report)
npm run test:coverage

# بیلد نهایی و اعتبارسنجی تایپ‌های تایپ‌اسکریپت
npm run build
```

---

## 📂 ساختار فایل‌های پروژه / Project Structure

```
digitalcomm/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # خط‌لوله تست و بیلد گیت‌هاب (CI)
│       └── pages.yml              # استقرار خودکار روی GitHub Pages (CD)
├── src/
│   ├── core/                      # موتور محاسبات ریاضی و پردازش سیگنال
│   │   ├── types.ts               # اینترفیس‌ها و ساختار داده‌ها
│   │   ├── prng.ts                # تولیدکننده شبه‌تصادفی xoshiro128+
│   │   ├── modulation.ts          # مدولاسیون BPSK, QPSK, 16-QAM, 64-QAM با کد گری
│   │   ├── channel.ts             # کانال AWGN با تبدیل باکس-مولر
│   │   ├── ber-math.ts            # تابع Q، erfc آبراموویتز و اشتگان و بازه ویلسون
│   │   ├── pulse-shaping.ts       # فیلترهای نایکوئیست کسینوس وارونه (RC و RRC)
│   │   ├── ofdm.ts                # مدولاسیون چندحاملی، FFT/IFFT Radix-2 و PAPR
│   │   ├── fading-channel.ts      # کانال‌های محوشدگی مسطح ریلی و رایسی با اکولایزر ZF
│   │   ├── channel-coding.ts      # کد خطی همینگ(7,4) و کد کانولوشن با الگوریتم ویتربی
│   │   └── mimo.ts                # کدگذاری فضا-زمان آلاموتی ۲×۱ و ظرفیت MIMO
│   ├── worker/                    # نخ پس‌زمینه Web Worker و بافر سه‌گانه
│   │   ├── triple-buffer.ts       # انتقال حافظه مشترک صفر-کپی
│   │   └── sim-worker.ts          # شبیه‌ساز پس‌زمینه با توقف تطبیقی
│   ├── rendering/                 # موتور رندرینگ Canvas 2D
│   │   ├── renderer.interface.ts  # اینترفیس رندر نمودارها
│   │   └── canvas-renderer.ts     # رندر با راندمان بالا و رنگ‌های OKLCH
│   ├── export/                    # خروجی اسکریپت پایتون
│   │   └── python-exporter.ts     # تولید اسکریپت‌های مستقل NumPy/SciPy/Matplotlib
│   ├── hooks/                     # هوک‌های سفارشی ری‌اکت
│   │   └── useWorkerSimulation.ts # اتصال پایدار ورکر و مدیریت رویدادها
│   └── components/                # کامپوننت‌های رابط کاربری ری‌اکت
│       ├── TheoryPanel.tsx        # پنل آموزشی نظریه و فرمول‌های هر ماژول
│       ├── ControlPanel.tsx       # کنترل پارامترهای شبیه‌سازی و انتخابگر ۶ حالت
│       ├── BerChart.tsx           # نمودار لاگ-لاگ BER با بازه اطمینان ۹۵٪
│       ├── ConstellationDiagram.tsx # نمودار صورت فلکی در صفحه مختلط I/Q
│       └── App.tsx                # طرح‌بندی داشبورد اصلی
├── tests/                         # مجموعه ۶۳ تست خودکار
│   ├── prng.test.ts
│   ├── modulation.test.ts
│   ├── channel.test.ts
│   ├── ber-math.test.ts
│   ├── pulse-shaping.test.ts
│   ├── ofdm.test.ts
│   ├── fading-channel.test.ts
│   ├── channel-coding.test.ts
│   ├── mimo.test.ts
│   ├── python-exporter.test.ts
│   ├── integration.test.ts
│   └── ofdm-ber.test.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 🤝 مشارکت در پروژه / Contributing

از مشارکت شما در توسعه، رفع باگ و ارتقای شبیه‌سازی‌ها استقبال می‌کنیم!
We welcome contributions from educators, students, and engineers worldwide!

1. ریپازیتوری را Fork کنید.
2. یک شاخه فیچر جدید ایجاد کنید: `git checkout -b feature/NewSimulation`
3. تغییرات خود را با رعایت استاندارد TDD پیاده‌سازی نمایید (همراه با تست واحد).
4. مطمئن شوید تمام تست‌ها پاس می‌شوند: `npm test`
5. تغییرات را کامیت کنید: `git commit -m 'feat: add feature'`
6. به شاخه اصلی Pull Request ارسال کنید.

---

## 📚 مراجع علمی / References

1. **Proakis, J. G., & Salehi, M.** (2008). *Digital Communications* (5th ed.). McGraw-Hill.
2. **Goldsmith, A.** (2005). *Wireless Communications*. Cambridge University Press.
3. **Tse, D., & Viswanath, P.** (2005). *Fundamentals of Wireless Communication*. Cambridge University Press.
4. **Cover, T. M., & Thomas, J. A.** (2006). *Elements of Information Theory* (2nd ed.). Wiley-Interscience.
5. **Alamouti, S. M.** (1998). "A simple transmit diversity technique for wireless communications." *IEEE Journal on Selected Areas in Communications*, 16(8), 1451-1458.

---

## 📄 مجوز / License

این پروژه تحت مجوز **MIT** منتشر شده است. استفاده آموزشی و غیرتجاری کاملاً آزاد و رایگان می‌باشد.  
Released under the [MIT License](LICENSE).
