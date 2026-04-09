# Play Store Submission Guide

## ✅ Pre-Submission Checklist

### 1. Version Bump
Current version: `1.0.0` → Update to `2.0.0` (multi-tenant release)
- Edit `package.json`: `"version": "2.0.0"`
- Edit `capacitor.config.ts`: Add `version: '2.0.0'`

### 2. Build Web App
```bash
npm run build
```
This creates the optimized build in `dist/` folder for the APK.

### 3. Android Setup (One-time)
```bash
# Install Android dependencies
npm install @capacitor/android

# Add Android platform to Capacitor
npx cap add android

# Update Android project
npx cap update
```

### 4. Generate Signed APK

#### Step 1: Create Key Store (First time only)
```bash
# On Windows, use PowerShell
$env:JAVA_HOME = "C:\Program Files\Android\jdk\microsoft_dist_openjdk_17.0.11_9"
keytool -genkey -v -keystore poultry-tracker-release.jks `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias poultry-tracker-key
```

**Fill in values:**
- Keystore password: (create a strong password)
- Key password: (same password)
- CN (name): Your name
- OU (organization unit): Your company
- O (organization): Your company name
- L (city): Your city
- ST (state): Your state
- C (country): ZA (for South Africa) or your country code

**Save this information:**
- Keystore file: `poultry-tracker-release.jks`
- Keystore password: `[YOUR_PASSWORD]`
- Key alias: `poultry-tracker-key`
- Key password: `[YOUR_PASSWORD]`

#### Step 2: Configure Gradle (Android build)
Edit `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile file('poultry-tracker-release.jks')
        storePassword '[YOUR_KEYSTORE_PASSWORD]'
        keyAlias 'poultry-tracker-key'
        keyPassword '[YOUR_KEY_PASSWORD]'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

#### Step 3: Build Signed APK
```bash
# Navigate to Android folder
cd android

# Build release APK
./gradlew assembleRelease

# Build app bundle (Google Play format - RECOMMENDED)
./gradlew bundleRelease

# Output locations:
# APK: android/app/build/outputs/apk/release/app-release.apk
# Bundle: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📋 Play Store Listing Preparation

### Store Listing Details to Prepare

**App Title:**
```
Poultry Tracker
```

**Short Description:**
```
Manage sales & inventory for poultry business. Simple, fast, offline-ready.
```

**Full Description:**
```
Poultry Tracker helps poultry businesses:

✓ Record daily sales and revenue
✓ Track stock/inventory levels
✓ Manage credit sales and settlements
✓ View detailed analytics and reports
✓ Works offline - all data syncs automatically
✓ Multi-business support for franchises

Perfect for:
- Small poultry farms
- Market sellers
- Wholesalers
- Franchise networks

Features:
• Real-time sales tracking by product and payment method
• Inventory management with cost tracking
• Credit sales management with settlement tracking
• Monthly analytics and profit calculations
• Staff management (record sales under team members)
• Admin dashboard for business insights
• Offline-first design
• Automatic cloud sync

PRICING:
- Free Tier: 50 sales/month
- Pro Tier: ₦4.99/month - unlimited sales

All data is encrypted and secure. Your business information is yours alone.

Support: [your-email]
```

**Category:** Business

**Content Rating:** Everyone

**Privacy Policy URL:** [Create one and host]

**Support Email:** [your-email]

---

## 🎨 Design Assets Needed

### 1. App Icon (512x512 px, PNG)
- Logo should be the poultry emoji or professional design
- Current: Can use 🐔 emoji or create professional icon

### 2. Feature Graphics (1024x500 px, PNG)
- Screenshot 1: Sales recording interface
- Screenshot 2: Sales history
- Screenshot 3: Analytics dashboard
- Screenshot 4: Works offline feature

### 3. Screenshots (Multiple formats)
- Phone: 1080x1920 px
- Tablet: 2560x1440 px (optional)

**Recommended screenshots:**
1. **Record Sales** - Show the form with colorful inputs
2. **Sales History** - Display transaction table
3. **Analytics** - Charts and metrics
4. **Multi-tenant** - Business selector or brand
5. **Offline-ready** - Connection status indicator

---

## 📱 Play Store Account Setup

### Prerequisites
1. **Google Play Developer Account** ($25 one-time fee)
   - Visit: https://play.google.com/console
   - Create account with Google email
   - Accept terms and conditions

2. **Merchant Account** (for payments)
   - Required for in-app purchases (Pro tier)
   - Add billing information to Play Console

### Account Creation Steps
1. Go to https://play.google.com/console
2. Sign in with Google account
3. Accept Developer Agreement
4. Pay $25 registration fee
5. Complete merchant profile

---

## 🚀 Publishing Process

### Step 1: Create App in Play Console
1. Open Google Play Console
2. Click "Create app"
3. Enter app name: `Poultry Tracker`
4. Select category: Business
5. Create app

### Step 2: Upload APK/AAB
1. Go to "Release" → "Production"
2. Click "Create new release"
3. Upload signed APK or AAB
4. Review generated release notes
5. Click "Review release"

### Step 3: Complete Store Listing
1. Go to "Product details" → "Store listing"
2. Add:
   - Title: Poultry Tracker
   - Short description (80 chars max)
   - Full description
   - Screenshots (up to 8)
   - Feature graphic
   - Icon (512x512)
3. Add content rating (questionnaire)
4. Add privacy policy URL
5. Add contact details

### Step 4: Set Up Pricing
1. Go to "Pricing & distribution"
2. Select: "Free - This app is free"
   - (In-app purchases will be Pro tier)
3. Select target countries
4. Content rating: Everyone
5. Review Google Play policies

### Step 5: Finalize & Submit
1. Review all sections for completeness (green checkmarks)
2. Click "Submit app for review"
3. Wait for Google Play review (usually 1-24 hours)

---

## 🔐 First Time vs Subsequent Updates

### Initial Release
- Need: Signed APK or AAB, all store listing details, screenshots, policies
- Review time: 1-24 hours

### Update Releases
- Need: New signed APK/AAB, updated version code in `build.gradle`
- Review time: Usually faster (30 min - 2 hours)
- Auto-updates existing installations

### Version Code Management
Every release needs a new version code:
- Current: `1` (set in `android/app/build.gradle`, `versionCode`)
- For each release: Increment by 1

```gradle
android {
    defaultConfig {
        versionCode 2  // Increment for each release
        versionName "2.0.0"  // Human-readable version
    }
}
```

---

## 📧 Important Reminders

- ✅ Test app thoroughly on Android devices before submission
- ✅ Ensure offline functionality works (critical selling point)
- ✅ Multi-tenant features work with test users
- ✅ Freemium limits enforced (50 sales/month free)
- ✅ Privacy policy reflects data handling (Supabase RLS)
- ✅ Support email monitored for user issues

---

## 🎯 Next Steps

1. **Version bump:** Update to 2.0.0
2. **Build:** Run `npm run build` and `npm run build android`
3. **Generate keystore** and signed APK
4. **Create store listing** with screenshots and details
5. **Submit for review** when ready
6. **Monitor reviews** post-launch

---

## 💬 Quick Command Reference

```bash
# Development
npm install

# Build web
npm run build

# Initialize Android (first time)
npm install @capacitor/android
npx cap add android

# Sync web build to Android
npx cap copy

# Update Android project
npx cap update

# Open Android Studio for fine-tuning
npx cap open android

# Build signed release
cd android
./gradlew bundleRelease  # Recommended
# or
./gradlew assembleRelease  # Alternative APK format
```

---

## 📞 Support

For issues during submission:
- Google Play Help: https://support.google.com/googleplay
- Capacitor Docs: https://capacitorjs.com/docs
- Contact: [your-support-email]

---

**Good luck with launch! 🚀🐔**
