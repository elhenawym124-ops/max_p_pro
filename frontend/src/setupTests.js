/**
 * إعداد الاختبارات للتعلم المستمر
 */

import '@testing-library/jest-dom';

// Mock للـ Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  ArcElement: jest.fn(),
  BarElement: jest.fn(),
}));

// Mock للـ react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />,
  Bar: ({ data, options }) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />,
  Doughnut: ({ data, options }) => <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />,
  Pie: ({ data, options }) => <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />,
  Radar: ({ data, options }) => <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} />,
}));

// Mock للـ Date Picker
jest.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({ value, onChange, label }) => (
    <input
      data-testid="date-picker"
      type="date"
      value={value ? value.toISOString().split('T')[0] : ''}
      onChange={(e) => onChange && onChange(new Date(e.target.value))}
      aria-label={label}
    />
  ),
  LocalizationProvider: ({ children }) => <div>{children}</div>,
}));

// Mock للـ AdapterDateFns
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn(),
}));

// Mock للـ React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/learning/dashboard',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock للـ localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock للـ sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock للـ window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock للـ ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock للـ IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock للـ window.print
global.print = jest.fn();

// Mock للـ URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock للـ Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options ? options.type : '',
}));

// Mock للـ File
global.File = jest.fn().mockImplementation((content, name, options) => ({
  content,
  name,
  options,
  size: content ? content.length : 0,
  type: options ? options.type : '',
  lastModified: Date.now(),
}));

// Mock للـ FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  readAsBinaryString: jest.fn(),
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  result: null,
  error: null,
  readyState: 0,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
}));

// Mock للـ Canvas (للرسوم البيانية)
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Array(4),
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock للـ HTMLCanvasElement.prototype.toDataURL
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');

// إعداد متغيرات البيئة للاختبار
process.env.REACT_APP_API_URL = 'http://localhost:3000/api/v1';
process.env.NODE_ENV = 'test';

// تنظيف بعد كل اختبار
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// إعداد console.error للاختبارات
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// إعداد timeout للاختبارات
jest.setTimeout(10000);

// Mock للـ performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
};

// Mock للـ requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock للـ MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

// إعداد إضافي للـ Material-UI
global.document.createRange = () => ({
  setStart: () => {},
  setEnd: () => {},
  commonAncestorContainer: {
    nodeName: 'BODY',
    ownerDocument: document,
  },
});

// Mock للـ window.getComputedStyle
global.getComputedStyle = jest.fn(() => ({
  getPropertyValue: jest.fn(() => ''),
}));

console.log('✅ Setup tests completed for Continuous Learning components');
