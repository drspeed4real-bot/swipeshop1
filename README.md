# SwipeShop 🛍️
> Social Marketplace — تسوّق بأسلوب السوشيال ميديا

## هيكل المشروع

```
swipeshop/
├── index.html              # الصفحة الرئيسية
├── css/
│   └── style.css           # الأنماط المخصصة
├── js/
│   ├── supabase-config.js  # إعدادات Supabase (ضع مفاتيحك هنا)
│   ├── app.js              # الكود الرئيسي
│   └── profile.js          # دوال البروفايل
├── .gitignore
└── README.md
```

## الإعداد

### 1. أنشئ مشروع Supabase
اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً.

### 2. أضف مفاتيحك
افتح `js/supabase-config.js` واستبدل:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. أنشئ الجداول في Supabase
شغّل هذا SQL في Supabase SQL Editor:
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  description TEXT,
  price DECIMAL,
  category TEXT,
  images TEXT[],
  username TEXT,
  user_avatar TEXT,
  likes INT DEFAULT 0,
  views INT DEFAULT 0,
  comments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_id BIGINT REFERENCES products(id),
  text TEXT,
  username TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_id BIGINT REFERENCES products(id),
  liked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- تفعيل RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- السياسات
CREATE POLICY "Public products" ON products FOR SELECT USING (true);
CREATE POLICY "Users insert products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Auth users comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Auth users like" ON likes FOR ALL USING (auth.uid() = user_id);
```

## الرفع على GitHub Pages
1. ارفع المشروع على GitHub
2. اذهب إلى Settings → Pages
3. اختر Branch: main → Save
4. الموقع يشتغل على: `https://USERNAME.github.io/swipeshop`

## ⚠️ تحذير أمني
لا ترفع `js/supabase-config.real.js` على GitHub.
هذا الملف مُضاف لـ `.gitignore` تلقائياً.
