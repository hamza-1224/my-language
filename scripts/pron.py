"""Pronunciation helpers: espeak IPA → Devanagari (French) and → Latin translit (Persian)."""
import re, unicodedata, espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path()); EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
from phonemizer.backend import EspeakBackend
FR = EspeakBackend("fr-fr", with_stress=False, preserve_punctuation=False)
FA = EspeakBackend("fa", with_stress=False, preserve_punctuation=False)
from phonemizer.separator import Separator
SEP = Separator(phone=" ", word=" | ", syllable="")

def ipa(backend, words):
    return [s.strip() for s in backend.phonemize(words, separator=SEP, strip=True)]

# French phones → Devanagari. Vowels: (independent, matra)
FV = {"i":("ई","ी"),"e":("ए","े"),"ɛ":("ऐ","ै"),"a":("आ","ा"),"ɑ":("आ","ा"),"ɔ":("ऑ","ॉ"),"o":("ओ","ो"),"u":("ऊ","ू"),
      "y":("यू","्यू"),"ø":("अ","ॅ"),"œ":("अ","ॅ"),"ə":("अ","ॅ"),"ɐ":("अ","ॅ"),
      "ɑ̃":("ऑं","ॉं"),"ɛ̃":("ऐं","ैं"),"ɔ̃":("ओं","ों"),"œ̃":("अं","ं")}
FC = {"p":"प","b":"ब","t":"त","d":"द","k":"क","ɡ":"ग","g":"ग","f":"फ़","v":"व","s":"स","z":"ज़","ʃ":"श","ʒ":"झ़","m":"म","n":"न","ɲ":"न्य",
      "ŋ":"ङ","l":"ल","ʁ":"र","r":"र","j":"य","w":"व","ɥ":"व","x":"ख़","tʃ":"च","dʒ":"ज"}
def fr_dev(phones):
    out=[]; prev_cons=False
    for w in phones.split(" | "):
        ps=[p for p in w.split(" ") if p]; s=""; pc=False
        for p in ps:
            p=unicodedata.normalize("NFC",p).replace("ː","")
            if p in FV:
                ind,mat=FV[p]
                if pc: s+=mat
                else: s+=ind
                pc=False
            elif p in FC:
                if pc: s+="्"
                s+=FC[p]; pc=True
            else:
                pc=False
        out.append(s)
    return " ".join(out)

# Persian phones → app translit (â e i o u a, kh gh sh ch zh, ')
PM = {"ɑ":"â","a":"a","æ":"a","e":"e","i":"i","o":"o","u":"u","x":"kh","ʃ":"sh","tʃ":"ch","ʒ":"zh","dʒ":"j","ɣ":"gh","q":"gh","ɢ":"gh","ʔ":"'",
      "j":"y","ɾ":"r","r":"r","w":"v","v":"v","b":"b","p":"p","t":"t","d":"d","k":"k","ɡ":"g","g":"g","f":"f","s":"s","z":"z","m":"m","n":"n","l":"l","h":"h","c":"k","ɟ":"g","ŋ":"n"}
def fa_tr(phones):
    out=[]
    for w in phones.split(" | "):
        s=""
        for p in w.split(" "):
            if not p: continue
            p=re.sub(r"[0-9]","",p.replace("ː","").replace("ʰ",""))
            s+=PM.get(p,p)
        s=s.replace("ey","ey")
        out.append(s)
    return " ".join(out)

def french(words):
    return [fr_dev(x) for x in ipa(FR, words)]
def persian(words):
    # Read each half-space part on its own (همه‌گیری → hame + giri), then join them back.
    parts, idx = [], []
    for w in words:
        toks = []
        for tok in w.split(" "):
            ps = [x for x in tok.split("\u200c") if x]
            toks.append(list(range(len(parts), len(parts) + len(ps)))); parts += ps
        idx.append(toks)
    out = [fa_tr(x) for x in ipa(FA, parts)] if parts else []
    return [" ".join("".join(out[i] for i in t) for t in toks) for toks in idx]
