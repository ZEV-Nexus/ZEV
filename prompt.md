⭐ AI Agent UI 設計提示詞（最終版）
🎯 任務目標

請設計一套 iOS iMessage 風格聊天訊息 UI
僅允許修改前端呈現與互動行為
禁止更動資料結構或 API contract

📦 Message Data Schema（不可更動）
{
room: ObjectId
member: ObjectId
content: string
createdAt: Date
replyTo?: ObjectId
editedAt?: Date
deletedAt?: Date
attachments?: Attachment[]
}

⚠ 嚴格限制
禁止：

改 schema

改資料欄位命名

改資料階層

改 message grouping API

改後端 payload

✔ 允許：

UI layout

UI grouping logic

rendering optimization

scroll interaction

animation

responsive design

🎨 視覺風格規格（必須符合）
iOS iMessage 視覺語言
Message Bubble
類型 規格
自己 右對齊 藍色(primary)
他人 左對齊 灰色(muted)
最大寬度 75%
Padding 10~14px
圓角 asymmetric
Bubble Border Radius
Self:
20px 20px 4px 20px

Other:
20px 20px 20px 4px

空間規則
Message Grouping

同一 member 連續訊息：

不重複 avatar

不重複 sender name

bubble 間距縮小

不同 member：

增加 vertical spacing

顯示 avatar

🧠 Meta 資訊呈現規則
Timestamp

預設：

隱藏

觸發顯示：

hover

長按

bubble group 結尾

Edited State

顯示：

"Edited"

Deleted State

顯示：

This message was deleted

使用淡灰 italic style

Reply UI

必須包含：

preview snippet

reply message highlight

clickable scroll to original message

🖼 Attachments UI 規格
Image Attachment

要求：

大尺寸預覽

支援 lightbox

lazy loading

skeleton loading

File Attachment

顯示：

file icon

file name

file size

download button

📜 Scroll 行為規格
自動滾動
若使用者在底部：
新訊息 → 自動滾到底

若不在底部：
顯示 unread indicator

Unread Indicator

需求：

sticky floating button

顯示 unread count

click scroll to latest

滾動歷史訊息

需求：

向上滾動 → lazy load older messages

🚀 虛擬滾動（強制需求）
必須支援：

dynamic row height

image loading reflow

preserve scroll position

windowing rendering

建議使用：
react-virtuoso

🎞 動畫規格
新訊息動畫
fade in
slide up 8px

Reply highlight
flash background briefly

🧩 Component 架構要求

請輸出：

Component Tree
ChatMessageList
├ VirtualizedMessageList
├ DateSeparator
├ UnreadDivider
├ MessageGroup
│ ├ Avatar
│ ├ MessageBubble
│ ├ AttachmentRenderer
│ └ ReplyPreview

每個元件需輸出：

props interface

render responsibility

state handling

performance optimization strategy

🧮 Message Rendering 邏輯

請設計：

Grouping Logic
若：

- same member
- timestamp 差 < 5分鐘

→ merge group

Date Divider Logic
跨日期 → 插入 divider

📱 Responsive 行為
Mobile First

bubble 最大 85%

avatar size 28px

touch friendly spacing

Desktop

bubble 最大 60%

hover timestamp

hover reply action

🧾 Deleted Message 規則
保留 message height
避免 scroll jump

⚡ Performance 要求
必須支援：

10k message scroll

attachments lazy load

memoization

virtualization window tuning

🛠 技術堆疊要求

請輸出符合：

React
Next.js App Router
Tailwind CSS
TypeScript
react-virtuoso

📤 AI 必須輸出
1️⃣ UI Wireframe（文字描述）
2️⃣ Component 架構圖
3️⃣ TypeScript Props 設計
4️⃣ 虛擬滾動實作策略
5️⃣ Scroll State Machine
6️⃣ Attachment Rendering Strategy
7️⃣ Animation Spec
❌ 禁止輸出

backend 修改建議

schema redesign

API contract 修改

⭐ 設計品質標準

必須接近：

Apple iMessage
Telegram iOS
LINE iOS

⭐ 加分項目（非必要）

typing indicator

message reaction

long press action menu

⭐ 補充背景（提供 AI context）

系統為：

多人聊天室
DM + Group
支援 attachments
