# Privacy practices + justification từng quyền

Đây là phần làm hầu hết đơn nộp bị kẹt. Mỗi ô dưới đây copy thẳng vào tab **Privacy practices** trong Developer Dashboard. CWS chấp nhận tiếng Anh cho phần này — reviewer đọc bằng tiếng Anh, nên **dùng bản EN cho ô nhập**, bản VI để bạn đối chiếu.

---

# A. Single purpose

**EN — paste this:**
```
The single purpose of this extension is to block access to domains the user selects
themselves, and to temporarily unblock them when the user has earned credits in
The Brain Project application on Windows.

Every requested permission serves exactly that function: receiving the domain list
from the app running on the user's own machine, redirecting navigation requests for
those domains to a block page bundled inside the extension, and removing the
redirect when a valid temporary grant exists.

The extension has no second function. It injects no content scripts, reads and
modifies no page content, collects no data, and communicates with no remote server.
```

---

# B. Justification cho từng quyền

## 1. `declarativeNetRequest`

**EN — paste this:**
```
This is the core blocking mechanism. The extension registers dynamic
declarativeNetRequest rules that match main_frame navigations to the domains on the
user's own blocklist, and redirects them to blocked.html, a page bundled inside the
extension.

declarativeNetRequest was chosen specifically because it is the privacy-preserving
API: rules are declared to Chrome and evaluated by the browser itself. The extension
never observes, receives, reads, or logs the actual requests. The blocking API with
request visibility (webRequest) is deliberately not used.

Rules are rebuilt only when the domain list or the set of active unblock grants
changes.
```

**VI (đối chiếu):** Đây là cơ chế chặn cốt lõi. Luật động khớp điều hướng `main_frame` tới các tên miền trong danh sách của người dùng và chuyển hướng sang `blocked.html` nằm trong tiện ích. Chọn `declarativeNetRequest` chính vì nó là API bảo vệ quyền riêng tư — luật do Chrome tự đánh giá, tiện ích không bao giờ nhìn thấy request thật. Cố tình **không** dùng `webRequest`.

---

## 2. `storage`

**EN — paste this:**
```
Used to persist, in chrome.storage.local on the user's device only:
- the list of domains the user chose to block
- the 64-character pairing token that authenticates the local desktop app
- active temporary unblock grants and their expiry timestamps
- the lock-mode deadline
- connection status and the last error message, shown in the popup

This state must survive service worker termination and browser restarts. If it did
not, closing the browser would silently disable blocking, which defeats the purpose
of the product. The lock-mode deadline in particular is stored here on purpose: it
is what makes a lock survive the desktop app being killed.

Nothing stored here is transmitted anywhere.
```

**VI:** Lưu trên máy người dùng: danh sách tên miền, mã ghép nối 64 ký tự, các quyền mở tạm và hạn của chúng, hạn chế độ khóa, trạng thái kết nối. Phải sống sót qua việc service worker bị tắt và trình duyệt khởi động lại — nếu không thì đóng trình duyệt là hết chặn. Không thứ nào được gửi đi đâu.

---

## 3. `alarms`

**EN — paste this:**
```
MV3 service workers are terminated when idle. Two things must still happen on time
after termination:

1. When a temporary unblock grant or a lock expires, blocking must be re-applied at
   that exact moment, including on tabs already open.
2. The connection to the local desktop app must be re-established after the browser
   or the app restarts.

chrome.alarms is the only mechanism that can wake a terminated service worker for
this. A setTimeout would be lost with the worker. No alarm fires more often than
every 30 seconds.
```

**VI:** Service worker MV3 bị tắt khi rảnh. Cần đánh thức đúng lúc để (1) áp lại bộ chặn khi quyền mở tạm hoặc khóa hết hạn, (2) kết nối lại với ứng dụng sau khi khởi động lại. `setTimeout` sẽ mất theo service worker. Không báo thức nào chạy dày hơn 30 giây.

---

## 4. `host_permissions: <all_urls>` — ô quan trọng nhất

**EN — paste this:**
```
Required by the declarativeNetRequest "redirect" action. Chrome only applies a
redirect rule if the extension holds host permission for the request URL. Users
define their own blocklist — any domain they choose, at any time — so no fixed
match pattern can be declared in advance.

Scope of what this permission is actually used for, exhaustively:
1. Allowing declarativeNetRequest redirect rules to apply to the domains on the
   user's own list.
2. chrome.tabs.query / chrome.tabs.update, to redirect an ALREADY-OPEN tab to the
   block page when its domain becomes blocked or when a temporary unblock expires.
   Only tab.url is read, only to compare hostnames against the user's own list, only
   in memory. It is never stored, logged, or transmitted.

What this permission is NOT used for:
- There are no content scripts. The extension declares none and injects none.
- Page content, DOM, cookies, forms, and credentials are never read or modified.
- No data leaves the machine. The extension's only network connection is a
  WebSocket to ws://127.0.0.1:47831 (loopback) to the user's own desktop app.
- No analytics, no telemetry, no ads, no remotely hosted code.

The narrower alternative — declarativeNetRequest action type "block", which needs no
host permission — was evaluated and rejected because it replaces the extension's
block page with Chrome's generic ERR_BLOCKED_BY_CLIENT error, removing the guidance
and the unblock instructions the user needs at exactly that moment.
```

**VI:** Bắt buộc vì luật `redirect` của DNR chỉ áp dụng khi tiện ích có host permission cho URL đó. Người dùng tự đặt danh sách nên không thể khai báo trước match pattern cố định. Chỉ dùng cho đúng hai việc: (1) cho luật redirect chạy, (2) đọc `tab.url` để đưa tab đang mở về trang chặn. Không có content script, không đọc nội dung trang, không có dữ liệu nào rời máy.

---

## 5. Ô "Remote code" — bắt buộc trả lời

Chọn: **"No, I am not using remote code"**

**EN justification:**
```
All executable code is bundled in the package. There is no eval(), no new Function(),
no dynamically injected script, no CDN, no <script src> pointing outside the
extension. Verified by inspection of all three JavaScript files.
```

---

# C. Data usage — trả lời từng mục

CWS bắt tick từng loại dữ liệu. Câu trả lời:

| Loại dữ liệu | Tick? | Vì sao |
|---|---|---|
| Personally identifiable information | **Không** | Không có tên, email, tuổi, địa chỉ, danh tính. Không có tài khoản. |
| Health information | **Không** | — |
| Financial and payment information | **Không** | Credit là điểm trong app, không phải tiền. Không có thanh toán trong tiện ích. |
| Authentication information | **Không** | Mã ghép nối là chuỗi ngẫu nhiên do app tự sinh trên máy, không phải mật khẩu hay token của người dùng, không liên quan tới tài khoản nào. Nó không rời khỏi `127.0.0.1`. |
| Personal communications | **Không** | — |
| Location | **Không** | — |
| Web history | **Không** | ⚠ Đây là ô dễ tick nhầm nhất. Tiện ích **đọc** URL tab nhưng **không thu thập**. CWS định nghĩa "collect" là chuyển đi khỏi máy người dùng hoặc lưu lại. Ở đây URL chỉ được so hostname trong bộ nhớ rồi bỏ. Không ghi đĩa, không gửi đi. → **không tick**. |
| User activity | **Không** | Không theo dõi click, chuột, phím, thời gian trên trang. |
| Website content | **Không** | Không có content script, không đọc DOM. |

**Nếu bạn muốn an toàn tuyệt đối:** có thể tick "Web history" và giải thích. Nhưng như thế Chrome sẽ hiển thị nhãn thu thập dữ liệu trên trang store — mâu thuẫn trực tiếp với điểm bán hàng "không có máy chủ", và nó **không đúng** với thứ mã nguồn đang làm. Khuyến nghị: **không tick**, và dùng ô "Notes for reviewer" bên dưới để giải thích chủ động.

---

# D. Ba tuyên bố bắt buộc phải tick

Cả ba đều tick **Yes** — và cả ba đều đúng với sản phẩm này:

1. ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
2. ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
3. ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

---

# E. Privacy policy URL

```
https://the-brain-project.vercel.app/privacy
```

Trang đã được tạo tại `website/privacy.html`. **Phải deploy lại website trước khi nộp** — CWS kiểm tra URL này có sống không, và link chết là bị từ chối ngay. `vercel.json` đã bật `cleanUrls`, nên `privacy.html` sẽ phục vụ tại `/privacy`.

---

# F. Notes for reviewer — ô này đừng bỏ trống

Đây là chỗ chặn trước hai câu hỏi mà reviewer chắc chắn sẽ có. Copy nguyên văn:

```
Two things in this extension look unusual on first inspection. Both are explained
below so review is not blocked on them.

1) LOCALHOST WEBSOCKET
The service worker opens a WebSocket to ws://127.0.0.1:47831. This is the loopback
interface — the user's own computer — connecting to "The Brain Project", a free
open-source Windows desktop application that the user installs separately. That app
is the source of the user's blocklist and of the credits that permit temporary
unblocking. No packet from this extension ever reaches the internet. There is no
backend service, no third-party endpoint, and no analytics anywhere in the code.

To test: the extension is inert without the app. Install the desktop app from
https://the-brain-project.vercel.app, open Settings, copy the 64-character pairing
code, and paste it into the extension popup. The extension will then block the
domains configured in the app. Without pairing, the popup shows "Not paired" and no
rules are registered. A test build and pairing code can be provided on request.

2) <all_urls> HOST PERMISSION
Required by the declarativeNetRequest "redirect" action, which Chrome only applies
when the extension holds host permission for the request URL. The blocklist is
user-defined and arbitrary, so no fixed match pattern is possible. The extension
declares no content scripts, injects nothing into pages, and never reads page
content, cookies, or form data. Tab URLs are read only via chrome.tabs.query, only
to redirect an already-open tab to the extension's own block page, only in memory,
and are never stored or transmitted.

Source code, including this extension, is public:
https://github.com/minhnhathoang1003-crypto/The-Brain-Project

Contact: minhnhat.hoang1003@gmail.com
```
