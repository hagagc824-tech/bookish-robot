const WebSocket = require('websocket').client;
const http = require('http');

// ================== CẤU HÌNH & BIẾN TOÀN CỤC ==================
const PORT = process.env.PORT || 10000;

// Dữ liệu trả về API
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
const MAX_RECONNECT = 15; // Tăng giới hạn thử lại
const RECONNECT_BASE = 3000; // Thời gian cơ sở chờ kết nối lại

// ✅ ĐỊA CHỈ MỚI CHÍNH XÁC TỪ BẠN
const WS_URL = "wss://websocket.atpman.net/websocket2";

// ✅ CẤU HÌNH TIÊU ĐỀ KHỚP VỚI ỨNG DỤNG THẬT
const HEADERS = {
  "Host": "websocket.atpman.net",
  "Origin": "https://play.789club.sx",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_11 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Mobile/15E148 Safari/604.1",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
  "Upgrade": "websocket",
  "Connection": "Upgrade"
};

// ⚠️ THAY BẰNG GÓI TIN ĐĂNG NHẬP MỚI NHẤT BẠN LẤY ĐƯỢC TỪ GIAO DIỆN PROXY
const LOGIN_MESSAGE = [
  1,
  "MiniGame",
  "wanglin2019aaand",
  "WamgLin2091",
  {
    "info": "{\"ipAddress\":\"113.185.45.88\",\"wsToken\":\"THAY_BANG_TOKEN_MOI_CUA_BAN\",\"locale\":\"vi\",\"userId\":\"THAY_BANG_USERID_MOI\",\"username\":\"S8_wanglin2019aaand\",\"timestamp\":\"THAY_BANG_TIMESTAMP\",\"refreshToken\":\"THAY_BANG_REFRESH_TOKEN\"}",
    "signature": "THAY_BANG_CHUOI_SIGNATURE_MOI_CUA_BAN"
  }
];

// Tin nhắn đăng ký nhận dữ liệu
const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", {"cmd": 2000}];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", {"cmd": 10001}];

// ================== HÀM HỖ TRỢ ==================
function printJsonPretty(data, label = "") {
  if (label) {
    console.log("\n" + "=".repeat(60));
    console.log(`📌 ${label}`);
    console.log("=".repeat(60));
  }
  try {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2, 'utf8'));
    } else {
      console.log(String(data).substring(0, 1000));
    }
  } catch (err) {
    console.log("❌ Lỗi hiển thị:", err.message);
    console.log(data);
  }
}

// ================== XỬ LÝ WEBSOCKET ==================
function startWebSocket() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log("❌ Đã đạt giới hạn kết nối lại, dừng thử. Khởi động lại thủ công nếu cần.");
    return;
  }
  reconnectAttempts++;
  wsClient = new WebSocket();

  // Khi kết nối thành công
  wsClient.on('connect', (connection) => {
    console.log("✅✅✅ ĐÃ KẾT NỐI THÀNH CÔNG VỚI websocket2 ✅✅✅");
    wsConnection = connection;
    reconnectAttempts = 0; // Đặt lại bộ đếm khi thành công

    // Nhận tin nhắn từ máy chủ
    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        try {
          const rawText = message.utf8Data;
          // printJsonPretty(rawText, "📥 TIN NHẮN GỐC"); // Bỏ ghi log nếu không cần

          const data = JSON.parse(rawText);

          // Cập nhật ID sự kiện
          if (Array.isArray(data) && data.length >= 3 && data[0] === 7 && data[1] === "Simms" && typeof data[2] === "number") {
            const oldId = lastEventId;
            lastEventId = data[2];
            console.log(`🆔 Cập nhật ID: ${oldId} → ${lastEventId}`);
          }

          // ✅ XỬ LÝ CHÍNH: Kết quả Tài Xỉu cmd=2006
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item && typeof item === 'object' && item.cmd === 2006) {
                const sid = Number(item.sid || 0);
                const d1 = Number(item.d1 || 0);
                const d2 = Number(item.d2 || 0);
                const d3 = Number(item.d3 || 0);
                const tong = d1 + d2 + d3;
                const ketqua = tong >= 11 ? "Tài" : "Xỉu";

                // Cập nhật dữ liệu toàn cục
                latestResult = {
                  "Ket_qua": ketqua,
                  "Phien": sid,
                  "Tong": tong,
                  "Xuc_xac_1": d1,
                  "Xuc_xac_2": d2,
                  "Xuc_xac_3": d3,
                  "id": "@tranhoang2286"
                };

                console.log("\n🎲 === CÓ KẾT QUẢ MỚI ===");
                printJsonPretty(latestResult);
              }
            });
          }

        } catch (err) {
          console.log("⚠️ Lỗi phân tích tin nhắn:", err.message);
        }
      }
    });

    // Khi kết nối đóng
    connection.on('close', (code, desc) => {
      console.log(`🔌 Kết nối đóng | Mã: ${code} | Lý do: ${desc || "Không rõ"}`);
      const waitTime = RECONNECT_BASE * reconnectAttempts;
      console.log(`🔄 Đang kết nối lại sau ${waitTime/1000} giây...`);
      setTimeout(startWebSocket, waitTime);
    });

    // Khi có lỗi
    connection.on('error', err => {
      console.log("❌ Lỗi kết nối:", err.message);
    });

    // === GỬI GÓI TIN ĐĂNG NHẬP & ĐĂNG KÝ ===
    setTimeout(() => {
      console.log("📤 Gửi yêu cầu đăng nhập...");
      connection.sendUTF(JSON.stringify(LOGIN_MESSAGE));

      // Đợi một chút rồi đăng ký nhận dữ liệu
      setTimeout(() => {
        console.log("📤 Đăng ký nhận kết quả Tài Xỉu...");
        connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
        console.log("📤 Đăng ký thông tin phòng chơi...");
        connection.sendUTF(JSON.stringify(SUBSCRIBE_LOBBY));
      }, 1200);

      // === GỬI TIN DUY TRÌ KẾT NỐI ĐỊNH KỲ ===
      setInterval(() => {
        if (connection.connected) {
          connection.sendUTF("2"); // Tin nhắn Ping giữ kết nối
          connection.sendUTF(JSON.stringify(SUBSCRIBE_TX_RESULT));
          connection.sendUTF(JSON.stringify([7, "Simms", lastEventId, 0, { id: 0 }]));
        }
      }, 8000); // Gửi mỗi 8 giây

    }, 600);
  });

  // Khi kết nối thất bại
  wsClient.on('connectFailed', err => {
    console.log("❌❌❌ KẾT NỐI THẤT BẠI:", err.message);
    const waitTime = RECONNECT_BASE * reconnectAttempts;
    console.log(`🔄 Thử lại sau ${waitTime/1000} giây...`);
    setTimeout(startWebSocket, waitTime);
  });

  // Bắt đầu kết nối
  console.log(`🔄 Đang kết nối đến: ${WS_URL}`);
  wsClient.connect(WS_URL, null, null, HEADERS);
}

// ================== MÁY CHỦ HTTP CUNG CẤP API ==================
function startHttpServer() {
  const server = http.createServer((req, res) => {
    // Cấu hình CORS hoàn chỉnh
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Xử lý yêu cầu kiểm tra quyền truy cập
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Đường dẫn chính trả kết quả
    if (req.url === "/taixiu" && req.method === "GET") {
      res.writeHead(200);
      res.end(JSON.stringify(latestResult, null, 2, 'utf8'));
      console.log(`🌐 Đã trả dữ liệu cho yêu cầu: ${req.url}`);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Đường dẫn không tồn tại", status: 404 }));
    }
  });

  // Lắng nghe trên tất cả địa chỉ mạng, phù hợp với Render
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🌐🌐🌐 MÁY CHỦ API ĐÃ CHẠY THÀNH CÔNG 🌐🌐🌐`);
    console.log(`📍 Địa chỉ: http://localhost:${PORT}/taixiu`);
    console.log(`📍 Trên Render: https://<tên-dự-án>.onrender.com/taixiu`);
    console.log("=".repeat(60));
  });
}

// ================== KHỞI ĐỘNG TOÀN BỘ HỆ THỐNG ==================
console.log("🚀🚀🚀 KHỞI ĐỘNG HỆ THỐNG 789CLUB - PHIÊN BẢN ĐÃ SỬA 🚀🚀🚀");
console.log("=".repeat(60));

// Khởi động song song
startWebSocket();
startHttpServer();
