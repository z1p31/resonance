import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'共鸣 Resonance · 现在就听',description:'发现正在流行的旋律，随机遇见喜欢的歌，分享你的音乐感受。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{var b=localStorage.getItem("resonance-scenic-blur");document.documentElement.style.setProperty("--scenic-blur",(b!==null&&Number.isFinite(Number(b))?Math.min(32,Math.max(0,Number(b))):8)+"px");document.documentElement.dataset.skinCategory=localStorage.getItem("resonance-skin-category")==="solid"?"solid":"scenic";var s=localStorage.getItem("resonance-skin");document.documentElement.dataset.skin=["forest","blue","orange","gray","pink","purple","bamboo","gold"].includes(s)?s:"forest";var p=localStorage.getItem("resonance-appearance");var t=p==="dark"||p==="light"?p:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}`}}/></head><body>{children}</body></html>}



