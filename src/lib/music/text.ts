// text.ts — turning the bytes of sidecar text files (.lrc, .cue, .txt) into strings, and repairing tag
// strings that an older tool decoded with the wrong code page ("ÓêÌìµÄ´°±ß" is GBK 雨天的窗边 read as
// latin1). Chinese users mostly meet GBK/GB18030 and Big5, sometimes Japanese Shift_JIS, and tags that
// hold UTF-8 bytes in an ISO-8859-1 frame. Decisions are made per album so one release is never half
// repaired; the original strings stay in tags_raw so a repair can be undone.
// Feature doc: ai/features/music/music.md (上传与入库: GBK / Big5 乱码按专辑判定可撤回).

export type TextEncodingName = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030' | 'big5' | 'shift_jis' | 'windows-1252';

type CjkEncoding = 'gb18030' | 'big5' | 'shift_jis';

// The legacy CJK code pages tried, in the order that wins a tie (most of our users write GBK).
const CJK_ENCODINGS: CjkEncoding[] = ['gb18030', 'big5', 'shift_jis'];

// Frequent characters of Chinese text (simplified, then traditional forms), Japanese kanji, and the
// surnames and given-name characters common in artist names; a correct decoding is full of them, a wrong
// one lands on rare characters.
const COMMON_CHARS = new Set(
    [
        '的一是不了在人有我他这个们中来上大为和国地到以说时要就出会可也你对生能而子那得于着下自之年过发后作里',
        '用道行所然家种事成方多经么去法学如都同现当没动面起看定天分还进好小部其些主样理心她本前开但因只从想实',
        '日军者意无力它与长把机十民第公此已工使情明性知全三又关点正业外将两高间由问很最重并物手应战向头文体政',
        '美相见被利什二等产或新己制身果加西斯月话合回特代内信表化老给世位次度门任常先海通教儿原东声提立及比员',
        '解水名真论处走义各入几口认条平系气题活尔更别打女变四神总何电数安少报才结反受目太量再感建务做接必场件',
        '计管期市直德资命山金指克许统区保至队形社便空决治展马科司五基眼书非则听白却界达光放强即像难且权思王象',
        '完设式色路记南品住告类求据程北边死张该交规万取拉格望觉术领共确传师观清今切院让识候带导争运笑飞风步改',
        '收根干造言联持组每济车亲极林服快办议往元英士证近失转夫令准布始怎呢存未远叫台单影具罗字爱击流备兵连调',
        '深商算质团集百需价花党华城石级整府离况亚请技际约示复病息究线似官火断精满支视消越器容照须九增研写称企',
        '八功吗包片史委乎查轻易早曾除农找装广显吧阿李标谈吃图念六引历首医局突专费号尽另周较注语仅考落青随选列',
        '武红响虽推势参希古众构房半节土投某案黑维革划敌致陈律足态护七兴派孩验责营星够章音跟志底站严巴例防族供',
        '效续施留讲型料终答紧黄绝奇察母京段依批群项故按河米围江织害斗双境客纪采举杀攻父苏密低朝友诉止细愿千值',
        '仍男钱破网热助倒育属坐帝限船脸职速刻乐否刚威毛状率甚独球般普怕弹校苦创假久错承印晚兰试股拿脑预谁益阳',
        '若哪微尼继送急血惊伤素药适波夜省初喜卫源食险待述陆习置居劳财环排福纳欢雷警获模充负云停木游龙树疑层冷',
        '洲冲射略范竟句室异激汉村哈策演简卡罪判担州静退既衣您宗积余痛检差富灵协角占配征修皮挥胜降阶审沉坚善妈',
        '刘读啊超免压银买皇养伊怀执副乱抗犯追帮宣佛岁航优怪香著田铁控税左右份穿艺背阵草脚概恶块顿敢守酒岛托央',
        '户烈洋哥索胡款靠评版宝座释景顾弟登货互付伯慢欧换闻危忙核暗姐介坏讨丽良序升监临亮露永呼味野架域沙掉括',
        '鱼杂误湾吉减编楚肯测败屋跑梦散温困剑渐封救贵缺楼县尚毫移娘朋画班智亦耳恩短掌恐遗固席松秘谢遇康虑幸均',
        '钟诗藏赶剧票损忽巨旧端探湖录叶春乡附吸予礼港雨呀板庭妇归睛饭额含顺输摇招婚脱补谓油旅材灭逐莫笔亡鲜词',
        '择寻厂睡博烟诺岸唐卖载健堂旁宫喝借君禁阴园谋避抓荣姑孙逃牙束跳顶玉镇雪午练迫爷篇肉嘴馆遍凡洞卷牛宁纸',
        '私庄祖丝翻暴森塔默握戏隐熟骨访弱歌店鬼软典欲伙遭盘爸扩盖弄雄稳忘刺拥徒杨齐赛趣曲刀床迎冰虚玩窗醒妻透',
        '替休虎途绿兄套毕唯谷轮库迹尤街促延震弃甲伟麻川缓潜闪售灯针哲抵抱鼓纯夏忍页折尊吴秀混雅振染盛怒舞圆搞',
        '狂姓残秋培迷诚宽宇猛摆梅伸摩末乃悲拍丁硬麦操阻彩抽赞魔沿喊违妹浪丰蓝殊献桌啦夺汽烧距偏符勇触课敬哭懂',
        '墙召巧侧冒债融惯享戴童犹乘挂奖厚纵障涉彻丈爆描洗患妙镜唱烦签仙彼仿倾牌陷鸟咱菜闭奋庆泪茶疾缘播朗奶季',
        '丹狗尾仪偷奔珠虫孔宜桥淡翼恨繁寒伴叹旦愈潮缩聚径恰挑袋灰捕珍幕映裂隔启尖忠累炎暂估荒横拒忆孤鼻闹羊呆',
        '衡零穷舍码婆魂灾腿胆俗胸晓劲贫仁偶恢圈摸仰润堆碰稍迟废净壁旋冬抬蛋晨吹鸡倍杯骑乏渡旗甘耐凭抢粗肩梁幻',
        '皆碎宙叔岩荡爬荷返井壮薄悄扫敏剩颗骂赏液箱贴漫酸腰舒眉忧浮辛恋餐吓挺辞峰尺昨辈滑扰绕慈阅汗枝拖墨插箭',
        '粉泥拔骗凤慧媒佩扑龄惜豪掩兼跃欣惠册飘闲惨洁踪频磨递撞滚奏颜疯坡瞧燃焦柳锁逼昏劝搜勤驾漂饮朵仔柔俩幼',
        '牧凉佳浓芳竹腹跌垂脉貌猜怜陶寄扶铺寿惧汤肥尝匆辉奈扣嘛凝慰厌脏腾幽怨鞋丢埋泉涌躲紫艰吾慌祝吐狠咬邻赤',
        '挤弯椅陪割揭悟聪雾锋梯猫祥阔牵鸣阁屈袖臂蛇柱抛鼠琴瓶恼燕狼池疼冠粒遥尘抚浅钻晶苍喷敲寂熊湿暖糖帽哀宿',
        '踏烂抖夹擦猪恒搬纹醉拳斜稀晃唇吻甜蜜糕橘桃橙樱伞帘霞虹蝶萤铃钢弦笛鼓纱袜裙衫粥汤盐',
        '這們來時為說國會對後裡麼過發現動點經長兩從頭間問關實種學樣開見還進無與機當沒電數體聲氣書東車門話將業',
        '處應該給張總聽讓愛夢風淚語紅飛陽雲憶願戀傷離歸嗎樂誰謝歲歡錯難邊遠戰鄉燈寫讀覺興獨靜舊夠隨記溫親請認',
        '識幾義產場員計設論結變際術導權資區報傳運師華連條帶強約據達觀調議選視歷專價陰陸陳隊響頁領題顏馬鳥麗齊',
        '龍積窮紀終統絕綠線緊繼續羅習聞聯職腦舉萬藝號蘇衛裝規許證豐負財貨質購買賣費賽趕軍輕輸辦農遺郵醫鐘鐵閃',
        '閱險雙雖頂項順須預類館驗髮魚點黨齒畫窗燒島橋櫻絲繞亂歌聲曉輝彩夜閒歷殘淺深綿輕歎聽戀戲劇鏡湖鍵鐘鈴燭',
        '私僕君空星光道街駅雪花朝今明来永遠心優手目胸輝響瞳翼扉届抱想願世界季節春夏秋冬海青赤黒色音楽曲様言葉',
        '話読帰戻変続終始伝渡違込出会別恋好嫌笑泣怒喜悲寂嬉痛苦甘辛弱短高低新古若早遅近広狭暗冷暖涼熱静騒綺麗幻',
        '影闇炎氷雲虹月宙地球町村屋鍵川森木草実種枝猫犬牛虫母父姉妹友彼俺貴方誰何物所場左右半分秒週毎昨昼夕晩',
        '円桜気歩涙声駆夢私達僕達届',
        '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢',
        '姜崔钟谭陆汪范金石廖贾夏韦付方邹孟熊秦邱江尹薛闫段雷侯史陶黎贺顾郝龚邵钱严覃戴莫孔向汤伦杰俊迅棋谦琪甄',
        '玫瑰伟芳娜秀英敏丽磊军洋艳娟涛超霞桂辉玲萍鑫鹏浩婷琳晶慧佳欣怡涵瑶璐薇倩雯颖妍琪婉蓉菲莉茜芸蕾悦晴轩宁',
        '陳劉楊黃趙吳孫馬鄭謝許韓馮鄧蕭葉蘇魏呂盧鍾譚陸賈韋鄒閻龍賀顧龔錢嚴湯倫傑偉麗軍豔娟濤蘭剛輝鵬瑋',
        '單簡處臉腳職藝號補製複觸訂訊討訪詞試詩詳認誤課調談論謀講證議護變讚貓責貴費貼賞賢質贈贊趙跡軌軟載輪輯',
        '轉遲鄰醜釋針鈴銀鋼錄鍋鏡閉闆陣階險隱雜雞霧靈顆顧飲飽驚鬆鬧鳴麥歐殘決況淨減測滅滿漢漸潔濃濕濟灣灑烏煙',
        '煩熱爭爺牆獎獲獻環畫療癡盡監盤眾睜確礎禮種稱穩築簽籃糧紋納紙級紛細組絲維網綿緒緣編緩練縮績織繪纏義聰',
        '肅脫膽臨臺莊蓋蓮藍藏藥蟲衝裝襯覆規譜警譯譽豬鐵'
    ].join('')
);

// Unicode code points of the windows-1252 characters in 0x80–0x9F, mapped back to their byte.
const CP1252_BYTES = new Map<number, number>([
    [0x20ac, 0x80],
    [0x201a, 0x82],
    [0x0192, 0x83],
    [0x201e, 0x84],
    [0x2026, 0x85],
    [0x2020, 0x86],
    [0x2021, 0x87],
    [0x02c6, 0x88],
    [0x2030, 0x89],
    [0x0160, 0x8a],
    [0x2039, 0x8b],
    [0x0152, 0x8c],
    [0x017d, 0x8e],
    [0x2018, 0x91],
    [0x2019, 0x92],
    [0x201c, 0x93],
    [0x201d, 0x94],
    [0x2022, 0x95],
    [0x2013, 0x96],
    [0x2014, 0x97],
    [0x02dc, 0x98],
    [0x2122, 0x99],
    [0x0161, 0x9a],
    [0x203a, 0x9b],
    [0x0153, 0x9c],
    [0x017e, 0x9e],
    [0x0178, 0x9f]
]);

// A decoding of a whole file wins over windows-1252 only above this average character score.
const DECODE_MIN_SCORE = 0.2;
// A repair of short tag strings needs this average score (a three-character name with one frequent
// character passes; readings made of rare characters do not).
const REPAIR_MIN_SCORE = 0.3;
// A CJK repair scoring this high is trusted over a one-character UTF-8 reading of the same bytes.
const CLEAN_CJK_SCORE = 0.6;

// Strict decoders, created once per encoding.
const fatalDecoders = new Map<string, TextDecoder>();

// A cached TextDecoder for the encoding that throws on malformed input instead of inserting U+FFFD.
const fatalDecoder = (encoding: TextEncodingName): TextDecoder => {
    let decoder = fatalDecoders.get(encoding);
    if (!decoder) {
        decoder = new TextDecoder(encoding, { fatal: true });
        fatalDecoders.set(encoding, decoder);
    }
    return decoder;
};

// Decode the bytes strictly; returns null when they are not valid in that encoding.
const strictDecode = (bytes: Uint8Array, encoding: TextEncodingName): string | null => {
    try {
        return fatalDecoder(encoding).decode(bytes);
    } catch {
        return null;
    }
};

// True for CJK ideographs (basic block and extension A) and Japanese kana.
const isCjk = (code: number): boolean =>
    (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x3041 && code <= 0x30ff);

// How much one non-ASCII character looks like real CJK text: frequent characters score 1, kana and CJK
// punctuation a little less, other ideographs 0, and the characters wrong decodings produce (private
// use, half-width katakana, stray Greek/Cyrillic, box drawing, controls) score below 0.
const charScore = (char: string, code: number): number => {
    if (COMMON_CHARS.has(char)) return 1;
    if (code >= 0x3041 && code <= 0x30ff) return 0.6;
    if ((code >= 0x3000 && code <= 0x303f) || (code >= 0xff01 && code <= 0xff5e)) return 0.5;
    if (code === 0xb7 || code === 0x2014 || code === 0x2026 || (code >= 0x2018 && code <= 0x201d)) return 0.5;
    if (code >= 0x4e00 && code <= 0x9fff) return 0;
    if (code <= 0x9f) return -3;
    if (code >= 0xe000 && code <= 0xf8ff) return -2;
    if (code > 0xffff || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0xf900 && code <= 0xfaff)) return -1;
    if (code >= 0xff61 && code <= 0xff9f) return -1;
    if ((code >= 0x0370 && code <= 0x04ff) || (code >= 0x2500 && code <= 0x257f)) return -0.5;
    if (code >= 0xac00 && code <= 0xd7af) return -0.5;
    if ((code >= 0x2190 && code <= 0x21ff) || (code >= 0x25a0 && code <= 0x26ff) || code === 0xd7 || code === 0xf7) {
        return 0;
    }
    return -0.25;
};

type Score = { total: number; chars: number; cjk: number; worst: number };

// Sum the character scores of every non-ASCII character in the texts.
const scoreTexts = (texts: string[]): Score => {
    const score: Score = { total: 0, chars: 0, cjk: 0, worst: 1 };
    for (const text of texts) {
        for (const char of text) {
            const code = char.codePointAt(0) as number;
            if (code < 0x80) continue;
            const value = charScore(char, code);
            score.total += value;
            score.chars += 1;
            score.worst = Math.min(score.worst, value);
            if (isCjk(code)) score.cjk += 1;
        }
    }
    return score;
};

// Average score per non-ASCII character (0 when there are none).
const average = (score: Score): number => (score.chars ? score.total / score.chars : 0);

// True when the only CJK in the texts are single characters wedged against ASCII letters ("Pl當ido",
// "d閒unte"): what one accented letter of a Latin word turns into when read as a CJK code page, while real
// titles mix them with longer CJK runs ("晴天 (Live版)") or stand apart ("Lo-fi 时光").
const onlyGluedCjk = (texts: string[]): boolean => {
    let glued = 0;
    for (const text of texts) {
        const chars = [...text];
        for (let i = 0; i < chars.length; i++) {
            if (!isCjk(chars[i].codePointAt(0) as number)) continue;
            const before = chars[i - 1] ?? '';
            const after = chars[i + 1] ?? '';
            if (isCjk(before.codePointAt(0) ?? 0) || isCjk(after.codePointAt(0) ?? 0)) return false;
            if (!/[A-Za-z]/.test(before) && !/[A-Za-z]/.test(after)) return false;
            glued += 1;
        }
    }
    return glued > 0;
};

// True when the texts hold an ASCII letter.
const hasLatinLetters = (texts: string[]): boolean => texts.some((text) => /[A-Za-z]/.test(text));

// True when every non-ASCII character of a UTF-8 reading sits in an everyday block (Latin-1 and Latin
// extended letters, basic Greek and Cyrillic, punctuation, symbols, CJK, Hangul, full-width forms, emoji);
// GBK bytes that happen to be valid UTF-8 land in IPA, combining marks or historic Cyrillic instead.
const plausibleUtf8 = (text: string): boolean => {
    for (const char of text) {
        const code = char.codePointAt(0) as number;
        if (code < 0x80) continue;
        const everyday =
            (code >= 0xa0 && code <= 0x24f) ||
            (code >= 0x386 && code <= 0x3ce) ||
            (code >= 0x401 && code <= 0x45f) ||
            (code >= 0x2000 && code <= 0x2bff) ||
            (code >= 0x3000 && code <= 0x9fff) ||
            (code >= 0xac00 && code <= 0xd7af) ||
            (code >= 0xf900 && code <= 0xfaff) ||
            (code >= 0xff00 && code <= 0xffef) ||
            (code >= 0x1f000 && code <= 0x1faff);
        if (!everyday) return false;
    }
    return true;
};

// Count the characters above ASCII.
const nonAsciiCount = (text: string): number => {
    let count = 0;
    for (const char of text) if ((char.codePointAt(0) as number) >= 0x80) count += 1;
    return count;
};

// The bytes a mis-decoded string came from, when every character is one a latin1 or windows-1252 decoder
// can produce and at least one is above ASCII; null for plain ASCII or strings that are real Unicode.
const latin1Bytes = (value: string): Uint8Array | null => {
    const bytes = new Uint8Array(value.length);
    let high = false;
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        const byte = code < 0x100 ? code : CP1252_BYTES.get(code);
        if (byte === undefined) return null;
        bytes[i] = byte;
        if (byte >= 0x80) high = true;
    }
    return high ? bytes : null;
};

type Repair = { encoding: TextEncodingName; texts: string[] };

// Pick the one encoding that turns every byte string into believable text. UTF-8 wins when its strict
// reading works and looks ordinary, unless it yields a single character and a clean CJK reading of two or
// more characters (or of text without Latin letters) competes; otherwise the best-scoring CJK code page
// that decodes all of them, contains CJK that is not just letters glued into Latin words, and clears the
// score bar.
const chooseRepair = (byteStrings: Uint8Array[]): Repair | null => {
    if (!byteStrings.length) return null;
    let best: (Repair & { score: number; cjk: number }) | null = null;
    for (const encoding of CJK_ENCODINGS) {
        const texts = byteStrings.map((bytes) => strictDecode(bytes, encoding));
        if (texts.some((text) => text === null)) continue;
        const decoded = texts as string[];
        const score = scoreTexts(decoded);
        if (!score.cjk || score.worst <= -2 || average(score) < REPAIR_MIN_SCORE || onlyGluedCjk(decoded)) continue;
        if (!best || average(score) > best.score) {
            best = { encoding, texts: decoded, score: average(score), cjk: score.cjk };
        }
    }
    const utf8 = byteStrings.map((bytes) => strictDecode(bytes, 'utf-8'));
    if (utf8.every((text) => text !== null && plausibleUtf8(text))) {
        const texts = utf8 as string[];
        const letters = texts.reduce((sum, text) => sum + nonAsciiCount(text), 0);
        const cleanCjk = best && best.score >= CLEAN_CJK_SCORE && (best.cjk >= 2 || !hasLatinLetters(best.texts));
        if (letters >= 2 || !cleanCjk) return { encoding: 'utf-8', texts };
    }
    return best ? { encoding: best.encoding, texts: best.texts } : null;
};

// UTF-16 without a byte order mark, recognised by the zero bytes of mostly-ASCII text (LRC timestamps).
const bomlessUtf16 = (bytes: Uint8Array): 'utf-16le' | 'utf-16be' | null => {
    const length = Math.min(bytes.length, 4096) & ~1;
    if (length < 4) return null;
    let evenZeros = 0;
    let oddZeros = 0;
    for (let i = 0; i < length; i += 2) {
        if (bytes[i] === 0) evenZeros += 1;
        if (bytes[i + 1] === 0) oddZeros += 1;
    }
    const pairs = length / 2;
    if (oddZeros > pairs * 0.3 && evenZeros < pairs * 0.05) return 'utf-16le';
    if (evenZeros > pairs * 0.3 && oddZeros < pairs * 0.05) return 'utf-16be';
    return null;
};

// Decode a text file of unknown encoding: byte order mark first, then BOM-less UTF-16, strict UTF-8, the
// legacy CJK code pages scored by how much of the result is common CJK text, and windows-1252 last.
export const decodeText = (bytes: Uint8Array): { text: string; encoding: TextEncodingName } => {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'utf-16le' };
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'utf-16be' };
    }
    const utf16 = bomlessUtf16(bytes);
    const wide = utf16 ? strictDecode(bytes, utf16) : null;
    if (utf16 && wide !== null) return { text: wide, encoding: utf16 };
    const utf8 = strictDecode(bytes, 'utf-8');
    if (utf8 !== null) return { text: utf8, encoding: 'utf-8' };
    let best: { text: string; encoding: CjkEncoding; score: number } | null = null;
    for (const encoding of CJK_ENCODINGS) {
        const text = strictDecode(bytes, encoding);
        if (text === null) continue;
        const score = average(scoreTexts([text]));
        if (!best || score > best.score) best = { text, encoding, score };
    }
    if (best && best.score >= DECODE_MIN_SCORE) return { text: best.text, encoding: best.encoding };
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
};

// Repair one string that was decoded as latin1/windows-1252 although its bytes were UTF-8, GBK, Big5 or
// Shift_JIS. Returns null when the string is plain ASCII, already real Unicode, or no reading is clean.
export const repairMojibake = (value: string): { text: string; encoding: TextEncodingName } | null => {
    const bytes = latin1Bytes(value);
    const repair = bytes ? chooseRepair([bytes]) : null;
    if (!repair || repair.texts[0] === value) return null;
    return { text: repair.texts[0], encoding: repair.encoding };
};

// One decision for a set of tag strings (an album, or one track's title/artist/album): the encoding that
// cleanly repairs every suspect value, or null. Values that are ASCII or already real Unicode are not
// suspects and do not block the decision; one suspect that no encoding explains (a real "Café") does.
export const detectAlbumMojibake = (values: string[]): TextEncodingName | null => {
    const suspects: Uint8Array[] = [];
    for (const value of values) {
        const bytes = latin1Bytes(value);
        if (bytes) suspects.push(bytes);
    }
    return chooseRepair(suspects)?.encoding ?? null;
};

// Apply an album decision from detectAlbumMojibake to one value: the repaired string, or the value
// unchanged when it is not a suspect or does not decode cleanly in that encoding.
export const decodeMojibake = (value: string, encoding: TextEncodingName): string => {
    const bytes = latin1Bytes(value);
    if (!bytes) return value;
    const text = strictDecode(bytes, encoding);
    if (text === null || text.includes('\uFFFD')) return value;
    for (const char of text) {
        const code = char.codePointAt(0) as number;
        if ((code >= 0x80 && code <= 0x9f) || (code >= 0xe000 && code <= 0xf8ff)) return value;
    }
    return text;
};
