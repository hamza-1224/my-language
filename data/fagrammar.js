// More Persian grammar lessons, added to the course in data/persian.js.
// Same shape: {id, t, x, cmp: [urdu, hindi], ex: [[persian, translit, english]], q: [[question, [options], correctIndex]]}.
// Comparisons use everyday spoken Urdu/Hindi. "drill" names a generated exercise using your own words (see app.js).
(function () {
  const L = window.COURSES.fa.levels;
  const add = (lvl, lessons) => L[lvl].grammar.push(...lessons);
  const tag = (id, drill) => { for (const l of Object.values(L)) for (const g of l.grammar) if (g.id === id) g.drill = drill; };
  tag("fa-a1-hal", "fa-present"); tag("fa-a2-mazi", "fa-past"); tag("fa-a1-ra", "fa-plural"); tag("fa-a1-ezafe", "fa-ezafe");

  add("A1", [
    { id: "fa-a1-script", t: "The Persian alphabet: what's new for Urdu readers",
      x: "If you read Urdu, you can already read Persian. Differences: Persian uses ی for both «i» and «y» (no ے), ه for final «e» (no ہ / ھ distinction), and has no ٹ ڈ ڑ ں or aspirated letters (بھ، کھ). ک and گ are the same. Short vowels are rarely written, so learn the pronunciation with each word.",
      cmp: ["اردو کا «ے» فارسی میں «ی» ہے، اور «ہ» کی جگہ «ه»: خانہ → خانه", "उर्दू का «ے» फ़ारसी में «ی» है, और «ہ» की जगह «ه»: ख़ाना → خانه"],
      ex: [["خانه", "khâne", "house"], ["زندگی", "zendegi", "life"], ["می‌روی", "miravi", "you go"]],
      q: [["Which letter does Persian NOT use?", ["ی", "ٹ", "ک", "ه"], 1], ["In Persian, «ی» at the end of a word sounds like…", ["e", "i", "ā", "o"], 1], ["«خانه» ends with the sound…", ["â", "a", "e", "u"], 2]] },
    { id: "fa-a1-negation", t: "Saying no: na-, ne-, nist",
      x: "Put na- before a verb to make it negative: mikhoram → nemikhoram (with mi- it becomes ne-), raftam → naraftam, dâram → nadâram. «Is not» is nist: in khub nist (this isn't good). «Na» alone means no.",
      cmp: ["«نہیں» کی جگہ فعل کے شروع میں «ن» لگائیں: می‌خورم = کھاتا ہوں، نمی‌خورم = نہیں کھاتا", "«नहीं» की जगह क्रिया के आगे «न» लगाएँ: मीख़ोरम = खाता हूँ, नेमीख़ोरम = नहीं खाता"],
      ex: [["من گوشت نمی‌خورم.", "man gusht nemikhoram", "I don't eat meat."], ["او اینجا نیست.", "u injâ nist", "He / she isn't here."], ["وقت ندارم.", "vaght nadâram", "I don't have time."]],
      q: [["«I don't know»", ["می‌دانم", "نمی‌دانم", "نه می‌دانم", "دانم نه"], 1], ["«It isn't expensive»", ["گران نیست", "گران نه است", "نه گران است", "گران نمی‌است"], 0], ["«I didn't go»", ["نمی‌روم", "نرفتم", "رفتم نه", "نه رفتم"], 1]] },
    { id: "fa-a1-questions", t: "Asking questions",
      x: "A yes/no question is just a statement with rising intonation: Chây mikhori? (Do you drink tea?). Formal Persian can start with âyâ. Question words go where the answer would be, usually before the verb: Kojâ miri? (Where are you going?) Esmet chiye? (What's your name?).",
      cmp: ["بالکل اردو کی طرح: «چائے پیو گے؟» صرف لہجہ بدلتا ہے", "बिल्कुल हिंदी की तरह: «चाय पियोगे?» बस आवाज़ ऊपर जाती है"],
      ex: [["کجا زندگی می‌کنی؟", "kojâ zendegi mikoni", "Where do you live?"], ["چرا نیامدی؟", "cherâ nayâmadi", "Why didn't you come?"], ["آیا شما دانشجو هستید؟", "âyâ shomâ dâneshju hastid", "Are you a student? (formal)"]],
      q: [["«How are you?» (friendly)", ["چطوری؟", "کجایی؟", "چند است؟", "کیستی؟"], 0], ["«Why» is…", ["کی", "چرا", "کجا", "چه"], 1], ["Formal yes/no questions may begin with…", ["آیا", "اگر", "که", "تا"], 0]] },
    { id: "fa-a1-numbers", t: "Numbers and counting things",
      x: "After a number, the noun stays SINGULAR: se ketâb (three books), not ketâbhâ. Spoken Persian often adds tâ: se tâ ketâb. Ordinals add -om: yekom/avval (first), dovvom (second), sevvom (third), panjom (fifth).",
      cmp: ["گنتی بہت ملتی جلتی ہے: دو، پنج، ہفت، ہشت، بیست = دو، پانچ، سات، آٹھ، بیس", "गिनती बहुत मिलती-जुलती है: दो, पंज, हफ़्त, हश्त, बीस = दो, पाँच, सात, आठ, बीस"],
      ex: [["دو تا چای", "do tâ châi", "two teas"], ["سه برادر دارم.", "se barâdar dâram", "I have three brothers."], ["روز پنجم", "ruz-e panjom", "the fifth day"]],
      q: [["«Four books»", ["چهار کتاب", "چهار کتاب‌ها", "کتاب چهار", "چهارم کتاب"], 0], ["«Third»", ["سه", "سوم", "سه‌ها", "سه‌تا"], 1], ["«Seven» is…", ["هشت", "هفت", "شش", "نه"], 1]] },
  ]);
  add("A2", [
    { id: "fa-a2-bayad", t: "Must, can, want: bâyad, tavânestan, khâstan",
      x: "These are followed by the subjunctive (be- + present stem): bâyad beram (I must go), mitunam biâm (I can come), mikhâm bekhoram (I want to eat). bâyad never changes. In speech: mikhâm, mikhây, mikhâd; mitunam, mituni, mitune.",
      cmp: ["«مجھے جانا ہے» = باید بروم؛ «میں آ سکتا ہوں» = می‌توانم بیایم", "«मुझे जाना है» = बायद बेरवम; «मैं आ सकता हूँ» = मीतवानम बियायम"],
      ex: [["باید کار کنم.", "bâyad kâr konam", "I have to work."], ["می‌توانی بیایی؟", "mitavâni biâyi", "Can you come?"], ["می‌خواهم فارسی یاد بگیرم.", "mikhâham fârsi yâd begiram", "I want to learn Persian."]],
      q: [["«I must sleep»", ["باید می‌خوابم", "باید بخوابم", "باید خوابیدم", "بخوابم باید"], 1], ["«We can go»", ["می‌توانیم برویم", "می‌توانیم می‌رویم", "توانیم رفتن", "برویم می‌توانیم"], 0], ["Spoken «I want» is…", ["می‌خوام", "می‌خواهم", "خواهم", "خوام"], 0]] },
    { id: "fa-a2-prepositions", t: "Place words: dar, ruye, zir, posht, kenâr",
      x: "Many place words take the ezafe: ruye miz (on the table), zir-e takht (under the bed), posht-e khâne (behind the house), kenâr-e daryâ (by the sea), jelo-ye dar (in front of the door), tu-ye kif (in the bag, spoken). Simple ones: dar (in), be (to), az (from), bâ (with).",
      cmp: ["اردو میں «میز کے اوپر» کہتے ہیں، فارسی میں «روی میز»: پہلے جگہ، پھر چیز", "हिंदी में «मेज़ के ऊपर» कहते हैं, फ़ारसी में «रूये मीज़»: पहले जगह, फिर चीज़"],
      ex: [["کتاب روی میز است.", "ketâb ruye miz ast", "The book is on the table."], ["گربه زیرِ تخت است.", "gorbe zir-e takht ast", "The cat is under the bed."], ["کنارِ دریا", "kenâr-e daryâ", "by the sea"]],
      q: [["«Behind the house»", ["پشتِ خانه", "خانه پشت", "پشت از خانه", "در پشت"], 0], ["«On the chair»", ["زیرِ صندلی", "روی صندلی", "در صندلی", "به صندلی"], 1], ["«With my friend»", ["از دوستم", "با دوستم", "به دوستم", "در دوستم"], 1]] },
    { id: "fa-a2-yek", t: "A, an, the: -i and yek",
      x: "Persian has no word for «the»: a noun alone is definite or general. «A / some» is -i on the end: ketâbi (a book) or yek ketâb (one / a book); spoken often yek ketâbi. A noun + -i can take ke: ketâbi ke kharidam (the book that I bought).",
      cmp: ["«ایک کتاب» = یک کتاب یا کتابی۔ «the» کا الگ لفظ اردو کی طرح فارسی میں بھی نہیں", "«एक किताब» = यक किताब या किताबी। «the» का अलग शब्द हिंदी की तरह फ़ारसी में भी नहीं"],
      ex: [["یک دوست دارم.", "yek dust dâram", "I have a friend."], ["مردی آمد.", "mardi âmad", "A man came."], ["کتابی که خریدم", "ketâbi ke kharidam", "the book that I bought"]],
      q: [["«A house» (one way)", ["خانه‌ای", "خانه‌ها", "خانه را", "این خانه"], 0], ["Which word means «the»?", ["یک", "-ی", "there is none", "را"], 2], ["«The man who came»", ["مرد که آمد", "مردی که آمد", "مردها آمد", "یک مرد آمد"], 1]] },
    { id: "fa-a2-hast", t: "There is / there are: hast, vojud dârad",
      x: "«There is» is hast (spoken hast / hastesh), formal vojud dârad. Negative: nist. Inja ye restorân hast? (Is there a restaurant here?) — Na, nist. In questions you'll also hear dârim (we have): Nun dârim? (Have we got bread?)",
      cmp: ["«یہاں ایک ریسٹورنٹ ہے؟» = اینجا یک رستوران هست؟", "«यहाँ एक रेस्टोरेंट है?» = इन्जा यक रेस्तोरान हस्त?"],
      ex: [["اینجا بانک هست؟", "injâ bânk hast", "Is there a bank here?"], ["امروز وقت نیست.", "emruz vaght nist", "There's no time today."], ["در شهر سه پارک وجود دارد.", "dar shahr se pârk vojud dârad", "There are three parks in the town."]],
      q: [["«There's no bread»", ["نان نیست", "نان نه است", "نان ندارد هست", "نیست نان هست"], 0], ["Formal «there is»", ["هست", "وجود دارد", "است", "دارم"], 1]] },
  ]);
  add("B1", [
    { id: "fa-b1-ke", t: "Long sentences with ke and tâ",
      x: "ke links clauses like Urdu «کہ / जो»: Fekr mikonam ke dorost ast (I think that it's right). tâ = so that / until: Zud raftam tâ dir naresam (I left early so as not to be late); Sabr kon tâ biyâd (Wait until he comes). Vaghti ke = when, ghabl az inke = before, ba'd az inke = after.",
      cmp: ["«کہ» دونوں زبانوں میں ایک ہی ہے: «میں سوچتا ہوں کہ…» = فکر می‌کنم که…", "«कि» दोनों में एक ही है: «मैं सोचता हूँ कि…» = फ़िक्र मीकोनम के…"],
      ex: [["می‌دانم که خسته‌ای.", "midânam ke khaste'i", "I know you're tired."], ["صبر کن تا برگردم.", "sabr kon tâ bargardam", "Wait until I'm back."], ["وقتی که بچه بودم…", "vaghti ke bachche budam", "When I was a child…"]],
      q: [["«I think that…»", ["فکر می‌کنم که…", "فکر می‌کنم تا…", "فکر که…", "تا فکر می‌کنم"], 0], ["«Wait until he comes»: صبر کن ___ بیاید.", ["که", "تا", "چون", "اگر"], 1], ["«Before» (+ clause)", ["بعد از اینکه", "قبل از اینکه", "وقتی که", "تا اینکه"], 1]] },
    { id: "fa-b1-shodan", t: "Becoming and getting: shodan",
      x: "shodan (to become) makes «get / become» verbs: khaste shodam (I got tired), bozorg shod (he grew up), dir shod (it got late). It also pairs with nouns where kardan is active: tamâm kardan (to finish something) vs tamâm shodan (to be finished); bâz kardan (to open) vs bâz shodan (to open, intransitive).",
      cmp: ["«کرنا / ہونا» والی جوڑی: ختم کرنا = تمام کردن، ختم ہونا = تمام شدن", "«करना / होना» वाली जोड़ी: ख़त्म करना = तमाम करदन, ख़त्म होना = तमाम शुदन"],
      ex: [["کلاس تمام شد.", "kelâs tamâm shod", "The class is over."], ["هوا سرد شد.", "havâ sard shod", "It got cold."], ["در باز شد.", "dar bâz shod", "The door opened."]],
      q: [["«I got tired»", ["خسته کردم", "خسته شدم", "خسته بودم", "خسته داشتم"], 1], ["«The film finished»", ["فیلم تمام کرد", "فیلم تمام شد", "فیلم تمام بود", "فیلم تمامید"], 1], ["«I finished the work»", ["کار را تمام کردم", "کار تمام شدم", "کار را تمام شد", "کارم تمام کرد"], 0]] },
    { id: "fa-b1-dorost", t: "Spoken endings: -e, -o, -am",
      x: "In speech the verb «to be» shrinks and sticks on: in khube (this is good), kojâst? (where is it?), khaste'am (I'm tired). râ becomes -o / -ro: ketâbo bedeh (give the book), mano (me). And -id → -in, -and → -an: chi mikhâyn? (what do you want?), raftan (they went).",
      cmp: ["جیسے اردو میں «کیا کر رہے ہو» بول چال میں بدل جاتا ہے، ویسے ہی", "जैसे हिंदी में «क्या कर रहे हो» बोलचाल में «क्या कर रए हो» हो जाता है"],
      ex: [["این خیلی خوبه.", "in kheyli khube", "This is really good."], ["کتابو بده.", "ketâbo bede", "Give (me) the book."], ["کجا رفتن؟", "kojâ raftan", "Where did they go?"]],
      q: [["Spoken «این خوب است»", ["این خوبه", "این خوبو", "این خوبم", "خوبی این"], 0], ["Spoken «کتاب را»", ["کتابا", "کتابو", "کتابه", "کتابم"], 1], ["«شما می‌روید» in speech", ["شما می‌رید", "شما می‌رین", "شما می‌رن", "شما می‌ره"], 1]] },
  ]);
  add("B2", [
    { id: "fa-b2-ezafe2", t: "Ezafe chains and compound words",
      x: "Ezafe can chain: ketâb-e târikh-e Irân-e dust-e man (my friend's book on Iranian history). Compound words skip the ezafe and often become one word: ketâbkhâne (library), dâneshgâh (university), khoshhâl (happy). Compound adjectives: khoshtip (stylish), badbakht (unlucky).",
      cmp: ["«حکومتِ ہندِ ...» والی اضافت لمبی ہو سکتی ہے؛ اور «کتب خانہ / کتابخانه» جیسے مرکب الفاظ", "«हुकूमत-ए-हिंद» वाली इज़ाफ़त लंबी हो सकती है; और «कुतुबख़ाना» जैसे जुड़े शब्द"],
      ex: [["خانه‌ی پدربزرگِ من", "khâne-ye pedarbozorg-e man", "my grandfather's house"], ["کتابخانه‌ی دانشگاه", "ketâbkhâne-ye dâneshgâh", "the university library"]],
      q: [["«My friend's car»", ["ماشینِ دوستِ من", "دوستِ ماشینِ من", "ماشین دوست من را", "منِ دوستِ ماشین"], 0], ["«Library» is one word:", ["کتاب خانه", "کتابخانه", "کتابِ خانه", "خانه‌کتاب"], 1]] },
    { id: "fa-b2-formal", t: "Reading the news: formal written style",
      x: "News Persian uses written forms (ast, -id, râ), Arabic-origin vocabulary and certain set verbs: e'lâm kard (announced), gozâresh dâd (reported), ezhâr kard (stated), ta'kid kard (stressed), barguzâr shod (was held). Sentences are long with ke and the past participle as a linking verb: … raft va … → rafte, … .",
      cmp: ["اخبار والی فارسی اردو اخبار سے بہت ملتی ہے: اعلان، اظہار، تاکید", "ख़बरों वाली फ़ारसी उर्दू अख़बार से बहुत मिलती है: ऐलान, इज़हार, ताकीद"],
      ex: [["وزیر اعلام کرد که…", "vazir e'lâm kard ke…", "The minister announced that…"], ["این نشست در تهران برگزار شد.", "in neshast dar Tehrân bargozâr shod", "This meeting was held in Tehran."]],
      q: [["«He stressed that…»", ["تأکید کرد که…", "تأکید شد که…", "تأکیدید", "تأکید داشت"], 0], ["«was held»", ["برگزار کرد", "برگزار شد", "برگزار بود", "برگزار داشت"], 1]] },
  ]);
})();
