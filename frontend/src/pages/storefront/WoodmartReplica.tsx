import React from 'react';
import {
    MagnifyingGlassIcon,
    HeartIcon,
    ShoppingBagIcon,
    Bars3Icon,
    ChevronDownIcon,
    HomeIcon,
    UserIcon,
    ArrowsRightLeftIcon,
    ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { storefrontSettingsService, StorefrontSettings } from '../../services/storefrontSettingsService';

const WoodmartReplica: React.FC = () => {
    // Determine asset path - this points to the folder we copied to public/
    const assetPath = '/woodmart_temp/Marketplace WordPress theme _ WoodMart_files';
    const [settings, setSettings] = React.useState<StorefrontSettings | null>(null);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Get companyId from URL query parameters
                const searchParams = new URLSearchParams(window.location.search);
                const companyId = searchParams.get('companyId') || 'default';

                console.log('🔍 [WoodmartReplica] Fetching settings for company:', companyId);
                const response = await storefrontSettingsService.getPublicSettings(companyId);
                if (response.success) {
                    console.log('✅ [WoodmartReplica] Settings loaded:', response.data);
                    setSettings(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch settings', error);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="font-lato text-[#767676] bg-white text-[14px]">
            {/* Inject Fonts & CSS Variables locally for this page */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Ubuntu:wght@500;600&display=swap');
                
                :root {
                    --wd-primary-color: #DB3340;
                    --wd-text-color: #767676;
                    --wd-title-font: 'Ubuntu', sans-serif;
                    --wd-text-font: 'Lato', sans-serif;
                }
                
                .font-title { font-family: var(--wd-title-font); }
                .font-text { font-family: var(--wd-text-font); }
                .woodmart-button {
                    background-color: var(--wd-primary-color);
                    color: white;
                    font-weight: 600;
                    text-transform: uppercase;
                    padding: 12px 24px;
                    border-radius: 0;
                    transition: all 0.25s ease;
                }
                .woodmart-button:hover {
                    background-color: #C42D3C;
                }
            `}</style>

            {/* Top Bar */}
            <div className="whb-top-bar bg-[#333] text-white text-[12px] py-2 border-b border-[#ffffff1a]">
                <div className="max-w-[1222px] mx-auto flex justify-between items-center px-4">
                    <div className="flex gap-4">
                        <span className="cursor-pointer hover:text-gray-300">English</span>
                        <span className="cursor-pointer hover:text-gray-300">Country</span>
                    </div>
                    <div className="font-bold flex-1 text-center hidden lg:block">FREE SHIPPING FOR ALL ORDERS OF $150</div>
                    <div className="flex gap-3">
                        <a href="#" className="hover:text-gray-300">Facebook</a>
                        <a href="#" className="hover:text-gray-300">Twitter</a>
                        <a href="#" className="hover:text-gray-300">Instagram</a>
                        <a href="#" className="hover:text-gray-300">YouTube</a>
                        <div className="h-4 w-[1px] bg-white/20 mx-2"></div>
                        <a href="#" className="flex items-center gap-1 hover:text-gray-300">
                            <img src={`${assetPath}/wd-envelope-light.svg`} width="18" height="18" alt="" />
                            <span>Newsletter</span>
                        </a>
                        <a href="#" className="hover:text-gray-300">Contact Us</a>
                        <a href="#" className="hover:text-gray-300">FAQs</a>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="whb-general-header bg-white py-6">
                <div className="max-w-[1222px] mx-auto flex items-center justify-between px-4">
                    {/* Logo */}
                    <div className="w-[250px]">
                        <a href="/">
                            <img src={`${assetPath}/wood-logo-dark.svg`} alt="WoodMart" className="max-w-[245px]" />
                        </a>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-[600px] mx-8 relative">
                        <form className="flex border-2 border-[#DB3340]">
                            <input
                                type="text"
                                placeholder="Search for products"
                                className="flex-1 px-4 py-2 outline-none text-[#777]"
                            />
                            <div className="border-l border-gray-200 px-4 flex items-center cursor-pointer text-[#333] hover:bg-gray-50 text-[13px] font-bold uppercase tracking-wider">
                                Select Category
                                <ChevronDownIcon className="w-3 h-3 ml-2" />
                            </div>
                            <button className="bg-[#DB3340] text-white px-6 font-bold uppercase text-[13px] hover:bg-[#C42D3C] transition-colors">
                                Search
                            </button>
                        </form>
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center cursor-pointer group">
                            <span className="text-3xl mb-1 group-hover:text-[#DB3340]">👤</span>
                            <span className="text-[13px] font-bold text-[#333] group-hover:text-[#DB3340]">Login / Register</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer group">
                            <span className="text-3xl mb-1 group-hover:text-[#DB3340] relative">
                                ♥
                                <span className="absolute -top-1 -right-2 bg-[#DB3340] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">0</span>
                            </span>
                            <span className="text-[13px] font-bold text-[#333] group-hover:text-[#DB3340]">Wishlist</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer group">
                            <span className="text-3xl mb-1 group-hover:text-[#DB3340] relative">
                                🔄
                                <span className="absolute -top-1 -right-2 bg-[#DB3340] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">0</span>
                            </span>
                            <span className="text-[13px] font-bold text-[#333] group-hover:text-[#DB3340]">Compare</span>
                        </div>
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <ShoppingBagIcon className="w-10 h-10 text-[#333] group-hover:text-[#DB3340]" />
                                <span className="absolute top-0 -right-1 bg-[#DB3340] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">0</span>
                            </div>
                            <div className="text-[13px] font-bold text-[#333] group-hover:text-[#DB3340]">
                                $0.00
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Bottom (Browse Categories) */}
            <div className="bg-[#DB3340] text-white h-[50px]">
                <div className="max-w-[1222px] mx-auto flex items-center px-4 h-full">
                    <div className="bg-[#C42D3C] h-full flex items-center px-6 cursor-pointer w-[270px]">
                        <Bars3Icon className="w-6 h-6 mr-3" />
                        <span className="font-bold uppercase text-[13px] tracking-wider">Browse Categories</span>
                    </div>
                    <nav className="flex-1 flex gap-8 px-6 text-[13px] font-bold uppercase tracking-wider">
                        <a href="#" className="hover:text-white/80">Home</a>
                        <a href="#" className="hover:text-white/80">Shop</a>
                        <a href="#" className="hover:text-white/80 text-[#fbbc34]">Blog</a>
                        <a href="#" className="hover:text-white/80">Pages</a>
                        <a href="#" className="hover:text-white/80">Elements</a>
                        <a href="#" className="hover:text-white/80">Buy</a>
                    </nav>
                    <div className="flex items-center gap-2 text-[13px] font-semibold bg-black/10 px-4 h-full">
                        <span>SPECIAL OFFER</span>
                    </div>
                </div>
            </div>

            <main className="bg-[#f9f9f9]">
                <div className="container mx-auto max-w-[1222px] px-4 py-8">

                    {/* Hero Banners Grid */}
                    <div className="grid grid-cols-12 gap-8 mb-8">
                        {/* Tall Banner Left (25%) - Meizu Backpack */}
                        <div className="col-span-12 lg:col-span-3 hidden lg:block relative group overflow-hidden cursor-pointer order-3 lg:order-1">
                            <img src={`${assetPath}/market-banner-4.jpg`} alt="Meizu Backpack" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute top-12 left-12">
                                <h4 className="text-3xl font-light mb-2">MEIZU <strong className="font-bold">BACKPACK</strong></h4>
                                <span className="text-2xl font-bold text-[#DB3340]">$49.00</span>
                            </div>
                        </div>

                        {/* Stacked Banners Middle (25%) */}
                        <div className="col-span-12 lg:col-span-3 flex flex-col gap-8 order-2">
                            <div className="relative group overflow-hidden cursor-pointer flex-1">
                                <img src={`${assetPath}/market-banner-2.jpg`} alt="Wool Scarves" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-8 left-8">
                                    <h4 className="text-2xl font-light mb-4">WOOL<br /><strong className="font-bold">SCARVES</strong></h4>
                                    <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">View More</span>
                                </div>
                            </div>
                            <div className="relative group overflow-hidden cursor-pointer flex-1">
                                <img src={`${assetPath}/market-banner-3.jpg`} alt="Apple Macbook" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-8 left-8">
                                    <h4 className="text-2xl font-light mb-4">APPLE<br /><strong className="font-bold">MACBOOK</strong></h4>
                                    <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">View More</span>
                                </div>
                            </div>
                        </div>

                        {/* Large Banner Right (50%) - Modern Dining Chair */}
                        <div className="col-span-12 lg:col-span-6 relative group overflow-hidden cursor-pointer order-1 lg:order-3">
                            <img src={`${assetPath}/market-banner-1.jpg`} alt="Modern Dining Chair" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute top-12 left-12">
                                <h4 className="text-4xl font-light mb-2">MODERN<br /><strong className="font-bold">DINING CHAIR</strong></h4>
                                <p className="text-gray-500 mb-4">It is a long established fact that a reader<br />will be distracted.</p>
                                <span className="text-2xl font-bold text-[#DB3340]">$189.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 bg-white p-8 mb-8 border border-gray-100">
                        {[
                            { title: 'FURNITURE', items: ['Kitchen', 'Bedroom', 'Bathroom', 'Decor'], icon: '🪑', badge: 'HOT' },
                            { title: 'MOBILE PHONES', items: ['Smartphones', 'Cell Phones', 'Brand Phones', 'Accessories'], icon: '📱' },
                            { title: 'FASHION', items: ["Men's Clothing", "Women's Clothing", 'Glasses', 'Accessories'], icon: '👔' },
                            { title: 'BAGS & SHOES', items: ["Men's Bags", "Men's Shoes", "Women's Bags", "Women's Shoes"], icon: '👜', badge: 'SALE' },
                            { title: 'WATCHES', items: ["Men's Watches", "Men's Jewelry", "Women's Watches", "Women's Jewelry"], icon: '⌚' },
                            { title: 'OUTDOOR', items: ['Knives & Tools', 'Exercise', 'Cycling', 'Camping & Hiking'], icon: '🚴', badge: 'NEW' },
                            { title: 'GAMING', items: ['PC Games', 'PC Components', 'Games Accessories', 'Gaming Chairs'], icon: '🎮' },
                            { title: 'BABY & KIDS', items: ['Baby Care', 'Baby Gear', 'Kids Clothing', 'Feeding'], icon: '👶' }
                        ].map((cat, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
                                        {cat.icon}
                                    </div>
                                    {cat.badge && (
                                        <span className={`absolute -top-1 -right-1 text-[9px] font-bold px-2 py-0.5 rounded ${cat.badge === 'HOT' ? 'bg-red-500 text-white' :
                                            cat.badge === 'SALE' ? 'bg-yellow-400 text-black' :
                                                'bg-green-500 text-white'
                                            }`}>
                                            {cat.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h5 className="font-bold text-sm tracking-wider uppercase mb-3 text-[#333]">{cat.title}</h5>
                                    <ul className="space-y-2 text-[13px] text-gray-500">
                                        {cat.items.map((item, i) => (
                                            <li key={i}><a href="#" className="hover:text-[#DB3340] transition-colors">{item}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Secondary Banners */}
                    <div className="grid grid-cols-12 gap-8 mb-12">
                        <div className="col-span-12 md:col-span-3 transition-transform hover:-translate-y-1 duration-300 cursor-pointer relative group">
                            <div className="overflow-hidden">
                                <img src={`${assetPath}/market-img-prod-futniture.jpg`} className="w-full transition-transform duration-700 group-hover:scale-105" alt="" />
                            </div>
                            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 bg-black/10 group-hover:bg-transparent transition-colors text-white">
                                <span className="text-xs font-bold uppercase tracking-wider mb-2">NEW ARRIVALS</span>
                                <h3 className="text-2xl mb-2 font-light"><strong className="font-bold">Bedroom</strong> Sets</h3>
                                <p className="text-sm italic mb-2">Temport sem finibus.</p>
                                <span className="text-xl font-bold text-white">$189.00</span>
                            </div>
                        </div>
                        <div className="col-span-12 md:col-span-3 transition-transform hover:-translate-y-1 duration-300 cursor-pointer relative group">
                            <div className="overflow-hidden">
                                <img src={`${assetPath}/market-img-prod-futniture-2.jpg`} className="w-full transition-transform duration-700 group-hover:scale-105" alt="" />
                            </div>
                            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 bg-black/10 group-hover:bg-transparent transition-colors text-white">
                                <span className="text-xs font-bold uppercase tracking-wider mb-2">BEST OFFERS</span>
                                <h3 className="text-2xl mb-2 font-light"><strong className="font-bold">Soft</strong> Chairs</h3>
                                <p className="text-sm italic mb-2">Temport sem finibus.</p>
                                <span className="text-xl font-bold text-white">$179.00</span>
                            </div>
                        </div>

                        {/* Product Tabs Section (Placeholder for next step) */}
                        <div className="col-span-12 md:col-span-9">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                                <h3 className="text-xl font-bold uppercase text-[#333]">BEST OF THE WEEK</h3>
                                <div className="flex gap-6 text-[13px] font-bold uppercase text-gray-400">
                                    <span className="text-[#333] border-b-2 border-[#DB3340] pb-4 -mb-4 cursor-pointer">FEATURED</span>
                                    <span className="hover:text-[#333] cursor-pointer transition-colors">CHAIRS</span>
                                    <span className="hover:text-[#333] cursor-pointer transition-colors">TABLES</span>
                                </div>
                            </div>
                            {/* Product Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { id: 14988, title: 'Quisque vitnis pretum', price: 269.00, img: 'market-table-12-430x487.jpg', sale: false },
                                    { id: 14956, title: 'Quis lorem utlibero', price: 269.00, img: 'market-chair-8.jpg', sale: false },
                                    { id: 14985, title: 'Tortor vamus suscipit', price: 269.00, img: 'market-table-11-1-430x487.jpg', sale: false, new: true },
                                    { id: 14948, title: 'Rutrum conue leoeget', price: 189.00, oldPrice: 269.00, img: 'market-chair-6-430x487.jpg', sale: true, discount: '-30%' },
                                    { id: 14983, title: 'Nulla quis loremut', price: 269.00, img: 'market-table-10-430x487.jpg', sale: false },
                                    { id: 14947, title: 'Adipiscing consectetur elit', price: 219.00, oldPrice: 269.00, img: 'market-chair-5-430x487.jpg', sale: true, discount: '-19%' },
                                ].map((product) => (
                                    <div key={product.id} className="group bg-white flex flex-col relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="relative overflow-hidden w-full aspect-[430/487]">
                                            <img
                                                src={`${assetPath}/${product.img}`}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Labels */}
                                            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                                                {product.sale && (
                                                    <span className="bg-[#DB3340] text-white text-[12px] font-bold px-2 py-1 rounded-none uppercase">
                                                        {product.discount || 'Sale'}
                                                    </span>
                                                )}
                                                {product.new && (
                                                    <span className="bg-[#83b735] text-white text-[12px] font-bold px-2 py-1 rounded-none uppercase">
                                                        New
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hover Actions */}
                                            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
                                                <div className="bg-white p-2 text-[#333] hover:text-[#DB3340] hover:bg-gray-100 cursor-pointer shadow-sm rounded-full w-10 h-10 flex items-center justify-center transition-all">
                                                    <HeartIcon className="w-5 h-5" />
                                                </div>
                                                <div className="bg-white p-2 text-[#333] hover:text-[#DB3340] hover:bg-gray-100 cursor-pointer shadow-sm rounded-full w-10 h-10 flex items-center justify-center transition-all">
                                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                                </div>
                                            </div>

                                            {/* Add to Cart - Slide Up */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-white/90 text-[#333] py-3 text-center font-bold uppercase text-[12px] tracking-wider translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer hover:bg-[#DB3340] hover:text-white flex items-center justify-center gap-2">
                                                <span>Add to cart</span>
                                            </div>
                                        </div>

                                        <div className="p-4 text-center">
                                            <h3 className="text-[14px] text-[#333] font-normal hover:text-[#DB3340] cursor-pointer mb-2 transition-colors">
                                                {product.title}
                                            </h3>
                                            <div className="text-[14px] text-[#333] font-bold">
                                                <a href="#" className="text-gray-400 hover:text-gray-600 text-[12px] block mb-1">Marketplace</a>
                                                <div className="flex items-center justify-center gap-2 text-[#DB3340]">
                                                    {product.oldPrice && (
                                                        <span className="text-gray-400 line-through font-normal text-[13px]">${product.oldPrice.toFixed(2)}</span>
                                                    )}
                                                    <span>${product.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* New Arrivals Section */}
                    <div className="bg-white p-8 mb-8">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                            <h3 className="text-xl font-bold uppercase text-[#333]">NEW ARRIVALS</h3>
                            <div className="flex gap-6 text-[13px] font-bold uppercase text-gray-400">
                                <span className="text-[#333] border-b-2 border-[#DB3340] pb-4 -mb-4 cursor-pointer">SMARTPHONES</span>
                                <span className="hover:text-[#333] cursor-pointer transition-colors">HEADPHONES</span>
                                <span className="hover:text-[#333] cursor-pointer transition-colors">BEST SELLERS</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-gray-50 p-4 h-64 flex items-center justify-center text-gray-400">
                                    Product {i}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Promotional Banners Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div className="relative group overflow-hidden cursor-pointer">
                            <img src={`${assetPath}/market-img-prod-electronic-2-1.jpg`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="iPhone X" />
                            <div className="absolute top-8 left-8 text-white">
                                <h4 className="text-2xl font-light mb-2">Apple<br /><strong className="font-bold">iPhone X</strong></h4>
                                <p className="text-[#DB3340] font-bold mb-2">Available now</p>
                                <span className="text-xl font-bold">$999.00</span>
                            </div>
                        </div>
                        <div className="relative group overflow-hidden cursor-pointer">
                            <img src={`${assetPath}/market-img-prod-electronic.jpg`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Google Pixel" />
                            <div className="absolute top-8 left-8 text-white">
                                <h4 className="text-2xl font-light mb-2">Google<br /><strong className="font-bold">Pixel 2XL</strong></h4>
                                <p className="text-[#DB3340] font-bold mb-2">Available now</p>
                                <span className="text-xl font-bold">$799.00</span>
                            </div>
                        </div>
                        <div className="relative group overflow-hidden cursor-pointer">
                            <img src={`${assetPath}/banner-watch-1.jpg`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Quartz Watch" />
                            <div className="absolute top-8 left-8 text-white">
                                <h4 className="text-2xl font-light mb-2">QUARTZ<br /><strong className="font-bold">WRIST WATCH</strong></h4>
                                <p className="mb-2">Donec accumsan eros.</p>
                                <span className="text-xl font-bold text-[#DB3340]">$299.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Limited Time Offer Section with Countdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 bg-gradient-to-r from-gray-100 to-gray-50 p-8">
                        {/* Left Side - Countdown */}
                        <div className="lg:col-span-4 flex flex-col justify-center items-center text-center">
                            <div className="mb-4">
                                <span className="text-[#DB3340] font-bold text-sm tracking-wider uppercase">LIMITED TIME OFFER</span>
                            </div>
                            <h2 className="text-3xl font-light mb-6">
                                PREMIUM AUDIO <strong className="font-bold">QUALITY HEADPHONES</strong>
                            </h2>

                            {/* Countdown Timer */}
                            <div className="flex gap-4 mb-6">
                                <div className="flex flex-col items-center">
                                    <div className="bg-white w-16 h-16 flex items-center justify-center text-2xl font-bold text-[#333] shadow-md">24</div>
                                    <span className="text-xs text-gray-500 mt-1">days</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-white w-16 h-16 flex items-center justify-center text-2xl font-bold text-[#333] shadow-md">21</div>
                                    <span className="text-xs text-gray-500 mt-1">hr</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-white w-16 h-16 flex items-center justify-center text-2xl font-bold text-[#333] shadow-md">46</div>
                                    <span className="text-xs text-gray-500 mt-1">min</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-white w-16 h-16 flex items-center justify-center text-2xl font-bold text-[#333] shadow-md">53</div>
                                    <span className="text-xs text-gray-500 mt-1">sc</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button className="bg-[#DB3340] text-white px-6 py-3 font-bold uppercase text-sm hover:bg-[#C42D3C] transition-colors">
                                    Read More
                                </button>
                                <button className="bg-white text-[#333] px-6 py-3 font-bold uppercase text-sm border-2 border-gray-300 hover:border-[#DB3340] transition-colors">
                                    Add to cart
                                </button>
                            </div>
                        </div>

                        {/* Right Side - Headphones Carousel */}
                        <div className="lg:col-span-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { img: 'market-headphones-4-430x487.jpg', title: 'Cupidata nonsunt', price: 269 },
                                    { img: 'market-headphones-3-430x487.jpg', title: 'Incididunt uter', price: 269 },
                                    { img: 'market-headphones-2-430x487.jpg', title: 'Exacitation ulamco', price: 255, oldPrice: 319, discount: '-20%' }
                                ].map((product, i) => (
                                    <div key={i} className="bg-white group relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="relative overflow-hidden aspect-[430/487]">
                                            <img
                                                src={`${assetPath}/${product.img}`}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                            {product.discount && (
                                                <span className="absolute top-3 left-3 bg-[#DB3340] text-white text-xs font-bold px-2 py-1 uppercase">
                                                    {product.discount}
                                                </span>
                                            )}
                                            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                                                    <HeartIcon className="w-5 h-5 text-[#333]" />
                                                </div>
                                                <div className="bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                                                    <MagnifyingGlassIcon className="w-5 h-5 text-[#333]" />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-3 text-center font-bold uppercase text-xs translate-y-full group-hover:translate-y-0 transition-transform cursor-pointer hover:bg-[#DB3340] hover:text-white">
                                                Add to cart
                                            </div>
                                        </div>
                                        <div className="p-4 text-center">
                                            <h3 className="text-sm text-[#333] mb-2">{product.title}</h3>
                                            <div className="text-sm">
                                                <a href="#" className="text-gray-400 hover:text-gray-600 text-xs block mb-1">Marketplace</a>
                                                <div className="flex items-center justify-center gap-2 text-[#DB3340] font-bold">
                                                    {product.oldPrice && (
                                                        <span className="text-gray-400 line-through font-normal">${product.oldPrice}</span>
                                                    )}
                                                    <span>${product.price}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Popular in Category */}
                    <div className="bg-white p-8 mb-8">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                            <h3 className="text-xl font-bold uppercase text-[#333]">POPULAR IN CATEGORY</h3>
                            <div className="flex gap-6 text-[13px] font-bold uppercase text-gray-400">
                                <span className="text-[#333] border-b-2 border-[#DB3340] pb-4 -mb-4 cursor-pointer">WATCHES</span>
                                <span className="hover:text-[#333] cursor-pointer transition-colors">JEWELRY</span>
                                <span className="hover:text-[#333] cursor-pointer transition-colors">FURNITURE</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-gray-50 p-4 h-48 flex items-center justify-center text-gray-400">
                                    Item {i}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Newsletter & Widgets Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                        {/* Sidebar Widgets */}
                        <div className="bg-white p-6">
                            <h3 className="font-bold text-sm uppercase mb-4 text-[#333]">FEATURED PRODUCTS</h3>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-200"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600">Product Name</p>
                                            <p className="text-[#DB3340] font-bold">$269.00</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6">
                            <h3 className="font-bold text-sm uppercase mb-4 text-[#333]">BEST OF THE WEEK</h3>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-200"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600">Product Name</p>
                                            <p className="text-[#DB3340] font-bold">$269.00</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6">
                            <h3 className="font-bold text-sm uppercase mb-4 text-[#333]">POPULAR IN CATEGORY</h3>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-200"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600">Product Name</p>
                                            <p className="text-[#DB3340] font-bold">$269.00</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Newsletter */}
                        <div className="bg-[#DB3340] p-6 text-white">
                            <h3 className="font-bold text-lg mb-2">SIGN UP TO OUR NEWSLETTER</h3>
                            <p className="text-sm mb-4 text-white/90">It is a long established fact that a reader will be distracted by the readable.</p>
                            <div className="flex gap-2 mb-4">
                                <input type="email" placeholder="Your email address" className="flex-1 px-3 py-2 text-gray-800" />
                                <button className="bg-black text-white px-4 py-2 font-bold">Sign up</button>
                            </div>
                            <div className="border-t border-white/20 pt-4 mt-4">
                                <p className="text-sm mb-3">OR JOIN US IN</p>
                                <div className="flex gap-3">
                                    <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">f</a>
                                    <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">t</a>
                                    <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">i</a>
                                    <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">y</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Banners */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        {['Chair Consequat', 'Silver Gamepad', 'Boots Piazza Italia'].map((title, i) => (
                            <div key={i} className="relative group overflow-hidden cursor-pointer h-64">
                                <div className="absolute inset-0 bg-gray-300"></div>
                                <div className="absolute top-8 left-8 text-white">
                                    <h4 className="text-xl font-bold mb-2">{title}</h4>
                                    <p className="text-sm mb-2">Product description</p>
                                    <span className="text-lg font-bold text-[#DB3340]">$399.00</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Brands Carousel */}
                    <div className="bg-white p-8 mb-8">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
                            {['Vitra', 'Rosenthal', 'PackIt', 'Niche', 'Magisso', 'Flos'].map((brand, i) => (
                                <div key={i} className="flex items-center justify-center h-20 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="text-gray-400 font-bold">{brand}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 bg-white p-8 mb-8">
                        {[
                            { icon: '🚚', title: 'FREE SHIPPING', desc: 'Proin condimentum sagittis' },
                            { icon: '↩️', title: 'FREE RETURNS', desc: 'Proin condimentum sagittis' },
                            { icon: '💬', title: 'SUPPORT 24/7', desc: 'Proin condimentum sagittis' },
                            { icon: '🔒', title: '100% SAFE & SECURE', desc: 'Proin condimentum sagittis' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="text-4xl">{item.icon}</div>
                                <div>
                                    <h4 className="font-bold text-sm mb-1 text-[#333]">{item.title}</h4>
                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#333] text-white">
                <div className="max-w-[1222px] mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        {/* About */}
                        <div>
                            <img src={`${assetPath}/wood-logo-dark.svg`} alt="WoodMart" className="mb-4 brightness-0 invert" />
                            <p className="text-sm text-gray-400 mb-4">Condimentum adipiscing vel neque dis nam parturient orci at scelerisque neque dis nam parturient.</p>
                            <div className="flex gap-3">
                                <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
                                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                                <a href="#" className="text-gray-400 hover:text-white">Instagram</a>
                            </div>
                        </div>

                        {/* Useful Links */}
                        <div>
                            <h4 className="font-bold mb-4 text-white">USEFUL LINKS</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">About Us</a></li>
                                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white">FAQs</a></li>
                                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                            </ul>
                        </div>

                        {/* Customer Service */}
                        <div>
                            <h4 className="font-bold mb-4 text-white">CUSTOMER SERVICE</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">Payment Methods</a></li>
                                <li><a href="#" className="hover:text-white">Money-back guarantee!</a></li>
                                <li><a href="#" className="hover:text-white">Returns</a></li>
                                <li><a href="#" className="hover:text-white">Shipping</a></li>
                            </ul>
                        </div>

                        {/* My Account */}
                        <div>
                            <h4 className="font-bold mb-4 text-white">MY ACCOUNT</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">My Account</a></li>
                                <li><a href="#" className="hover:text-white">Order History</a></li>
                                <li><a href="#" className="hover:text-white">Wishlist</a></li>
                                <li><a href="#" className="hover:text-white">Newsletter</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
                        <p>© 2024 WoodMart. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
            {/* Logic to hide Global Storefront Footer if rendered inside StorefrontLayout */}
            {React.useEffect(() => {
                const globalFooter = document.querySelector('.storefront-footer') as HTMLElement;
                if (globalFooter) {
                    globalFooter.style.display = 'none';
                }
                return () => {
                    if (globalFooter) {
                        globalFooter.style.display = 'block';
                    }
                };
            }, [])}
            {/* Mobile Bottom Navbar */}
            {(!settings || settings.mobileBottomNavbarEnabled !== false) && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-2 pb-safe">
                    <div className="flex justify-between items-center">
                        {/* Home - Default: Show */}
                        {(!settings || settings.mobileBottomNavbarShowHome !== false) && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <HomeIcon className="w-6 h-6" />
                                <span className="text-[10px] mt-1 font-medium">Home</span>
                            </a>
                        )}

                        {/* Shop - Default: Show */}
                        {(!settings || settings.mobileBottomNavbarShowShop !== false) && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <ShoppingBagIcon className="w-6 h-6" />
                                <span className="text-[10px] mt-1 font-medium">Shop</span>
                            </a>
                        )}

                        {/* Search - Default: Hide */}
                        {settings?.mobileBottomNavbarShowSearch && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <MagnifyingGlassIcon className="w-6 h-6" />
                                <span className="text-[10px] mt-1 font-medium">Search</span>
                            </a>
                        )}

                        {/* Wishlist - Default: Show */}
                        {(!settings || settings.mobileBottomNavbarShowWishlist !== false) && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <HeartIcon className="w-6 h-6" />
                                <span className="text-[10px] mt-1 font-medium">Wishlist</span>
                            </a>
                        )}

                        {/* Compare - Default: Show */}
                        {(!settings || settings.mobileBottomNavbarShowCompare !== false) && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <div className="relative">
                                    <ArrowsRightLeftIcon className="w-6 h-6" />
                                    <span className="absolute -top-1 -right-2 bg-[#DB3340] text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">0</span>
                                </div>
                                <span className="text-[10px] mt-1 font-medium">Compare</span>
                            </a>
                        )}

                        {/* Account - Default: Show */}
                        {(!settings || settings.mobileBottomNavbarShowAccount !== false) && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <UserIcon className="w-6 h-6" />
                                <span className="text-[10px] mt-1 font-medium">Account</span>
                            </a>
                        )}

                        {/* Cart - Default: Hide */}
                        {settings?.mobileBottomNavbarShowCart && (
                            <a href="#" className="flex flex-col items-center text-gray-600 hover:text-[#DB3340]">
                                <div className="relative">
                                    <ShoppingCartIcon className="w-6 h-6" />
                                    <span className="absolute -top-1 -right-2 bg-[#DB3340] text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">0</span>
                                </div>
                                <span className="text-[10px] mt-1 font-medium">Cart</span>
                            </a>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default WoodmartReplica;
