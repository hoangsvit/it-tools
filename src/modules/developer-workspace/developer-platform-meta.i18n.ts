import { i18n } from '@/plugins/i18n.plugin';

const messages = {
  en: {
    developerPlatform: {
      home: {
        workflowCards: {
          0: {
            name: 'API Debugging',
            description: 'Inspect tokens, URLs, payloads and HTTP responses in one practical flow.',
          },
          1: {
            name: 'Security Toolkit',
            description: 'Check password strength and work with hashes, HMAC and bcrypt.',
          },
          2: {
            name: 'Network Troubleshooting',
            description: 'Move from subnet math to address conversion, ranges and MAC lookup.',
          },
          3: {
            name: 'JSON Conversion',
            description: 'Transform JSON into common configuration and interchange formats.',
          },
        },
      },
    },
    tools: {
      categories: {
        vietnam: 'Vietnam',
      },
      'file-inspector': {
        title: 'Browser file inspector',
        description: 'Inspect common file signatures, metadata, dimensions, text previews and SHA-256 without uploading the file.',
        privacySummary: 'Selected files are inspected entirely in your browser and are never uploaded.',
      },
      'vietnam-bank-bin-lookup': {
        title: 'Vietnam bank BIN lookup',
        description: 'Search Vietnamese banks by BIN, NAPAS code, name or SWIFT/BIC and jump directly to VietQR generation.',
        privacySummary: 'Bank directory search runs entirely in your browser.',
      },
      'vietnamese-text-normalizer': {
        title: 'Vietnamese text normalizer',
        description: 'Normalize Vietnamese Unicode, remove diacritics, compact whitespace and create ASCII comparison keys locally.',
        privacySummary: 'Vietnamese text is normalized entirely in your browser.',
      },
      'vietqr-bank-generator': {
        privacySummary: 'Transfer payloads and generated QR images are processed locally in your browser.',
      },
    },
  },
  vi: {
    developerPlatform: {
      home: {
        workflowCards: {
          0: {
            name: 'Gỡ lỗi API',
            description: 'Kiểm tra token, URL, payload và phản hồi HTTP trong một quy trình thực tế.',
          },
          1: {
            name: 'Bộ công cụ bảo mật',
            description: 'Kiểm tra độ mạnh mật khẩu và làm việc với hash, HMAC và bcrypt.',
          },
          2: {
            name: 'Khắc phục sự cố mạng',
            description: 'Từ tính subnet đến chuyển đổi địa chỉ, dải IP và tra cứu MAC.',
          },
          3: {
            name: 'Chuyển đổi JSON',
            description: 'Chuyển JSON sang các định dạng cấu hình và trao đổi dữ liệu phổ biến.',
          },
        },
      },
    },
    tools: {
      categories: {
        vietnam: 'Việt Nam',
      },
      'file-inspector': {
        title: 'Trình phân tích tệp trong trình duyệt',
        description: 'Kiểm tra chữ ký tệp, metadata, kích thước, bản xem trước văn bản và SHA-256 mà không cần tải tệp lên máy chủ.',
        privacySummary: 'Tệp được phân tích hoàn toàn trong trình duyệt và không bao giờ được tải lên.',
      },
      'vietnam-bank-bin-lookup': {
        title: 'Tra cứu BIN ngân hàng Việt Nam',
        description: 'Tìm ngân hàng Việt Nam theo BIN, mã NAPAS, tên hoặc SWIFT/BIC và chuyển nhanh sang tạo VietQR.',
        privacySummary: 'Việc tìm kiếm danh mục ngân hàng diễn ra hoàn toàn trong trình duyệt.',
      },
      'vietnamese-text-normalizer': {
        title: 'Chuẩn hóa văn bản tiếng Việt',
        description: 'Chuẩn hóa Unicode tiếng Việt, bỏ dấu, thu gọn khoảng trắng và tạo khóa ASCII để so sánh ngay trong trình duyệt.',
        privacySummary: 'Văn bản tiếng Việt được chuẩn hóa hoàn toàn trong trình duyệt.',
      },
      'vietqr-bank-generator': {
        privacySummary: 'Payload chuyển khoản và ảnh QR được tạo và xử lý cục bộ trong trình duyệt.',
      },
    },
  },
} as const;

Object.entries(messages).forEach(([locale, message]) => {
  i18n.global.mergeLocaleMessage(locale, message);
});
