const WebSocket = require('websocket').client;
const http = require('http');

// ================== CẤU HÌNH & BIẾN TOÀN CỤC ==================
const PORT = process.env.PORT || 10000;
let latestResult = {
  "Ket_qua": "Chưa có kết quả",
  "Phien": 0,
  "Tong": 0,
  "Xuc_xac_1": 0,
  "Xuc_xac_2": 0,
  "Xuc_xac_3": 0,
  "id": "@tranhoang2286"
};
let lastEventId = 19;
let wsClient = null;
let wsConnection = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

// Cấu hình kết nối
const WS_URL = "wss://websocket.atpman.net/websocket";
const HEADERS = {
  "Host": "websocket.atpman.net",
  "Origin": "https://play.789club.sx",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
  "Connection": "Upgrade"
};

// Tin nhắn gửi đi
const LOGIN_MESSAGE = [
  1,
  "MiniGame",
  "wanglin2019aaand",
  "WamgLin2091",
  {
    "info": "{\"ipAddress\":\"113.185.45.88\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJlbXlldTE3ODljbHVuIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6NjU3NjU3NjksImFmZklkIjoiNzg5IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiI3ODkuY2x1YiIsInRpbWVzdGFtcCI6MTc2NjQ3MDk1NTY4OCwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIxMTMuMTg1LjQ1Ljg4IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vYXBpLnhldWkuaW8vaW1hZ2VzL2F2YXRhci9hdmF0YXJfMjUucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiMjFkMTUxMjEtYjIzOC00ZDIyLTgzMTMtNGI3YjYwN2VhZjIxIiwicmVnVGltZSI6MTc2NjQ3MDkzMDEwNCwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJTOF93YW5nbGluMjAxOWFhYW5kIn0.F5jr6g1BPGMQ-5EPRdck-PDvVDXcahyGySOFSjyNEuE\",\"locale\":\"vi\",\"userId\":\"21d15121-b238-4d22-8313-4b7b607eaf21\",\"username\":\"S8_wanglin2019aaand\",\"timestamp\":1766470955689,\"refreshToken\":\"34ed90232de44567aec7d4752b021717.e8cd9e15f74c42fb8bd491e395d73ab1\"}",
    "signature": "55A3202A0554F20C01D09CD018386265C93B292E843BE3722766912A8F01ACF50E9574D88D52FAFDABEBD4794D3306C87021EF3DD6B25DA102872D23C7C31A0F1D3EB99C0714968A64F6C40335726EB999F1CEAE49BC0954EABA48189E1BBE61BD40C898CA4D683DA76E24386F4431772D05BC8142DAEBFA90E27A9C250A5ED3"
  }
];
const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", {"cmd": 2000}];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", {"cmd": 10001}];

// ================== HÀM HỖ TRỢ ==================
function printJsonPretty(data, label = "") {
  if (label) console.log("\n" + "=".repeat(50), `📋 ${label}`, "=".repeat(50), sep="\n");
  try { console.log(typeof data === 'object' ? JSON.stringify(data, null, 2, 'utf8') : data); }
  catch (err) { console.log(data); }
}

// ================== WEBSOCKET XỬ LÝ ==================
function startWebSocket() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log("❌ Đã đạt số lần kết nối tối đa, dừng thử lại!");
    return;
  }
  reconnectAttempts++;
  wsClient = new WebSocket();

  wsClient.on('connect', (connection) => {
    console.log("✅ Đã kết nối WebSocket thành công");
    wsConnection = connection;
    reconnectAttempts = 0;

    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        try {
          const rawText = message.utf8Data;
          printJsonPretty(rawText.substring(0, 800), "📥 TIN NHẮN GỐC");
          const data = JSON.parse(rawText);

          // Cập nhật lastEventId
          if (Array.isArray(data) && data.length >= 3 && data[0] === 7 && data[1] === "Simms" && typeof data[2] === "number") {
            const oldId = lastEventId;
            lastEventId = data[2];
            console.log(`🆔 Cập nhật ID sự kiện: ${oldId} → ${lastEventId}`);
          }

          // Xử lý kết quả Tài Xỉu đúng cấu trúc
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item && typeof item === 'object' && item.cmd === 2006) {
                const sid = item.sid || 0;
                const d1 = Number(item.d1 || 0);
                const d2 = Number(item.d2 || 0);
                const d3 = Number(item.d3 || 0);
                const tong = d1 + d2 + d3;
                const ketqua = tong >= 11 ? "Tài" : "Xỉu";

                latestResult = {
                  "Ket_qua": ketqua,
                  "Phien": sid,
                  "Tong": tong,
                  "Xuc_xac_1": d1,
                  "Xuc_xac_2": d2,
                  "Xuc_xac_3": d3,
                  "id": "@tranhoang2286"
                };
                console.log("🎲 CẬP NHẬT KẾT QUẢ MỚI:");
                printJsonPretty(latestResult);
              }
            });
          }
        } catch (err) { console.log("❌ Lỗi phân tích JSON:", err.message); }
      }
    });

    connection.on('close', (code, desc) => {
      console.log(`🔌 Đóng kết nối | Mã: ${code} | Thông báo: ${desc}`);
      console.log(`🔄 Kết nối lại sau ${5*reconnectAttempts} giây...`);
      setTimeout(startWebSocket, 5000 * reconnectAttempts);
    });

    connection.on('error', err => console.log("❌ Lỗi kết nối:", err));

    // Gửi dữ liệu khởi tạo
    setTimeout(() => {
      console.log("📤 Đăng nhập...");
      connection.sendUTF(JSON.stringify(LOGIN_MESSAGE));
      setTimeout(() => {
        console.log("📤 Đăng ký nhận kết quả...");
        connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
        connection.sendUTF(JSON.stringify(SUBSCRIBE_LOBBY));
      }, 1500);

      // Duy trì kết nối
      setInterval(() => {
        if (connection.connected) {
          connection.sendUTF("2");
          connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
          connection.sendUTF(JSON.stringify([7, "Simms", lastEventId, 0, { id: 0 }]));
        }
      }, 8000);
    }, 800);
  });

  wsClient.on('connectFailed', err => {
    console.log("❌ Kết nối thất bại:", err);
    setTimeout(startWebSocket, 5000 * reconnectAttempts);
  });

  console.log("🔄 Đang kết nối đến WebSocket...");
  wsClient.connect(WS_URL, null, null, HEADERS);
}

// ================== MÁY CHỦ HTTP ==================
function startHttpServer() {
  http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (req.method === "OPTIONS") return res.writeHead(204), res.end();

    if (req.url === "/taixiu") {
      res.writeHead(200);
      res.end(JSON.stringify(latestResult, null, 2, 'utf8'));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({error:"Không tìm thấy đường dẫn"}));
    }
  }).listen(PORT, "0.0.0.0", () => console.log(`🌐 API chạy tại cổng: ${PORT}`));
}

// ================== KHỞI ĐỘNG ==================
console.log("🚀 Khởi động hệ thống 789club...");
startWebSocket();
startHttpServer();
