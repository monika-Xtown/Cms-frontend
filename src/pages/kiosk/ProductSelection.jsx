import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "../../context/OrderContext.jsx";
import api, { API_BASE_URL } from "../../config/api.js";
import Layout from "../../components/Layout.jsx";
import Loading from "../../components/Loading.jsx";
import { FaPlus, FaMinus, FaTh, FaList, FaRuler, FaTimes, FaLayerGroup } from "react-icons/fa";
import { FiSearch, FiUser, FiShoppingCart, FiChevronLeft, FiChevronRight, FiChevronDown, FiPackage, FiLogOut, FiImage, FiMenu, FiX } from "react-icons/fi";

import noImage from "../../assets/No_image.png";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const CartItem = ({ item, adjustProductQuantity }) => {
  const [imgError, setImgError] = useState(false);
  const { isDark } = useTheme();

  const imgUrl = item.images?.[0]?.url || item.image || item.image_path;

  const validUrl = useMemo(() => {
    if (!imgUrl) return null;
    return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
      ? imgUrl
      : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
  }, [imgUrl]);

  return (
    <div className="group relative p-3 sm:p-4 rounded-[1.5rem] border transition-all bg-[var(--surface-main)] border-[var(--border-default)] hover:border-[var(--brand-primary)]/30">
      <div className="flex gap-3 sm:gap-4 items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] p-2 sm:p-4 shrink-0 flex items-center justify-center overflow-hidden border border-[var(--border-default)] bg-[var(--surface-card)]">
          {!imgError && validUrl ? (
            <img
              src={validUrl}
              className="w-full h-full object-contain drop-shadow-md"
              onError={(e) => {
                e.target.onerror = null;
                setImgError(true);
              }}
              alt={item.name}
            />
          ) : (
            <img
              src={noImage}
              className="w-full h-full object-contain drop-shadow-md"
              alt="No image"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm sm:text-base font-bold capitalize truncate pr-2 text-[var(--text-primary)]">{(item.name_en || item.name)?.toLowerCase()}</h3>
            <p className="font-bold text-sm sm:text-base text-[var(--brand-primary)] shrink-0">₹{(parseFloat(item.variant_price || item.price || item.base_price) * item.quantity).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-[var(--surface-muted)] rounded-xl p-1">
              <button
                onClick={() => adjustProductQuantity(item, -1, item.variant_id)}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)] hover:bg-[var(--brand-primary)] hover:text-[var(--text-inverse)] hover:border-[var(--brand-primary)] transition-all active:scale-95"
              >
                <FaMinus className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <span className="min-w-[1.5rem] text-center text-lg sm:text-xl font-black text-[var(--text-primary)]">{item.quantity}</span>
              <button
                onClick={() => adjustProductQuantity(item, 1, item.variant_id)}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-lg shadow-[var(--brand-primary)]/20 transition-all active:scale-95 border border-transparent hover:brightness-110 hover:shadow-[var(--brand-primary)]/40"
              >
                <FaPlus className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductSelection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);

  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("productViewMode") || "card"
  );
  const [flippedImage, setFlippedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedUnit, selectedProducts, adjustProductQuantity, calculatePerDayTotal } = useOrder();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);



  useEffect(() => {
    localStorage.setItem("productViewMode", viewMode);
  }, [viewMode]);

  // No longer fetching attributes.
  // NOTE: Product variant selection (Size/Color) has been deprecated and 
  // currently products are added directly to the cart as simple items.



  const fetchProducts = useCallback(
    async (page) => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit,
          search: searchTerm || undefined
        };

        const res = await api.get(`/items/`, { params });

        console.log("✅ Kiosk Item Fetch success");

        const list = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.products)
            ? res.data.products
            : Array.isArray(res.data)
              ? res.data
              : [];

        setProducts(list);
        setCurrentPage(res.data?.currentPage || page);
        setTotalPages(res.data?.totalPages || 1);
        setTotalProducts(res.data?.totalItems || res.data?.totalProducts || res.data?.total || list.length);

        if (!list.length) {
          setError("No Items available.");
        }
      } catch (err) {
        console.error("❌ Fetch Items error:", err);
        setError("Failed to load Items.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(currentPage);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, fetchProducts]);

  // ================= RECOMMENDATIONS =================
  const [recommended, setRecommended] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user?.id && !user?.emp_code && !user?.username) return;

      try {
        setLoadingRecs(true);
        // Fetch last 20 orders for history
        const res = await api.get('/orders', { params: { limit: 20 } });
        let orders = res.data?.orders || res.data || [];

        // Filter for current user if backend doesn't automatically
        orders = orders.filter(o => {
          if (user.id && o.user_id) return String(o.user_id) === String(user.id);
          if (user.emp_code && o.emp_code) return o.emp_code === user.emp_code;
          return true; // Fallback
        });

        if (orders.length === 0) return;

        // Calculate frequency
        const frequencyMap = {};
        orders.forEach(order => {
          // Flatten items: support both item_ids array and items object array
          const items = order.items || order.order_items || [];
          if (items.length > 0) {
            items.forEach(item => {
              const id = item.item_id || item.id || item.product_id;
              if (id) frequencyMap[id] = (frequencyMap[id] || 0) + (item.quantity || 1);
            });
          } else if (order.item_ids && Array.isArray(order.item_ids)) {
            order.item_ids.forEach(id => {
              frequencyMap[id] = (frequencyMap[id] || 0) + 1;
            });
          }
        });

        // Get Top 4 IDs
        const sortedIds = Object.keys(frequencyMap)
          .sort((a, b) => frequencyMap[b] - frequencyMap[a])
          .slice(0, 4);

        if (sortedIds.length === 0) return;

        // Fetch details for these items
        // We'll use Promise.all to fetch individual items by ID
        const itemPromises = sortedIds.map(id =>
          api.get(`/items/${id}`)
            .then(r => r.data?.item || r.data?.product || r.data)
            .catch(() => null)
        );

        const fetchedItems = (await Promise.all(itemPromises)).filter(Boolean);
        setRecommended(fetchedItems);

      } catch (err) {
        console.error("Failed to load recommendations", err);
      } finally {
        setLoadingRecs(false);
      }
    };

    loadRecommendations();
  }, [user]);


  // ================= UTILS =================
  const getProductTotalQty = (productId) => {
    return selectedProducts
      .filter(p => p.id === productId)
      .reduce((sum, p) => sum + (p.quantity || 0), 0);
  };

  const getProductSizeQty = (productId, size) => {
    const found = selectedProducts.find(p => p.id === productId);
    return found ? found.quantity : 0;
  };

  // ================= MEMOS =================
  const productQuantities = useMemo(() => {
    const map = {};
    selectedProducts.forEach((p) => {
      map[p.id] = (map[p.id] || 0) + (p.quantity || 0);
    });
    return map;
  }, [selectedProducts]);

  const totalSelectedCount = useMemo(
    () => selectedProducts.reduce((s, p) => s + (p.quantity || 0), 0),
    [selectedProducts]
  );

  const handleContinue = () => {
    if (!totalSelectedCount) {
      alert("Select at least one Item");
      return;
    }
    navigate("/kiosk/calendar");
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="min-h-screen transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* HEADER & SEARCH SECTION */}
          <div className="pt-6 pb-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[var(--brand-primary)] rounded-full shadow-[0_0_20px_rgba(250,198,57,0.3)] shadow-[var(--brand-primary)]/30"></div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-medium leading-none capitalize text-[var(--text-primary)] animate-slide-up">
                    Order Our <span className="inline-flex flex-wrap gap-x-[1px] text-[var(--brand-primary)] lowercase">
                      {"best food".split("").map((char, i) => (
                        <span
                          key={i}
                          className="animate-letter-pop"
                          style={{ animationDelay: `${300 + (i * 50)}ms` }}
                        >
                          {char === " " ? "\u00A0" : char}
                        </span>
                      ))}
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
                {/* Mobile Specific Search (Full Width Row) */}
                <div className="sm:hidden flex items-center p-1.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-default)] w-full max-w-full">
                  <FiSearch className="ml-3 flex-shrink-0 text-[var(--text-secondary)]" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-0 py-1.5 px-3 bg-transparent border-none outline-none text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-center"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {/* Search Only */}
                  <div className="hidden sm:flex items-center p-1.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-default)] flex-1 sm:flex-none shadow-sm">
                    <div className="flex items-center h-10 px-3 group bg-white/40 rounded-xl border border-transparent focus-within:border-[var(--brand-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/10 transition-all w-full sm:w-auto">
                      <FiSearch className="mr-2 flex-shrink-0 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors" size={16} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-24 lg:w-48 h-full bg-transparent border-none outline-none text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                      />
                    </div>
                  </div>


                  {/* Icons Group */}
                  <div className="flex items-center gap-2 sm:gap-4 hidden sm:flex">

                    <div className="relative">
                      <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`relative z-[101] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border ${isProfileOpen ? "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                      >
                        <FiUser size={26} />
                      </button>

                      {isProfileOpen && (
                        <div className="absolute top-full right-0 mt-3 w-64 rounded-3xl shadow-xl border-2 border-[var(--border-default)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 bg-[var(--surface-card)]">
                          <div className="p-5 border-b border-[var(--border-default)] bg-[var(--surface-muted)]">
                            <p className="text-xs font-black uppercase tracking-widest mb-1 text-[var(--text-secondary)]">Current User</p>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[var(--text-inverse)] font-black text-sm">
                                {(user?.username || user?.emp_code || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm leading-tight text-[var(--text-primary)]">
                                  {user?.username || user?.first_name || "Guest User"}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 bg-[var(--text-primary)]/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                  {((user?.role?.toLowerCase() === 'employee') || user?.emp_code) ? "Employee" : (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) : "Kiosk")} • {user?.emp_code || user?.code || "ID: --"}
                                </p>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/kiosk/meal-plan')}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/50 shadow-sm"
                      title="Meal Plan"
                    >
                      <FiMenu size={26} />
                    </button>

                    <button
                      onClick={() => navigate('/kiosk/my-orders')}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/50 shadow-sm"
                      title="My Orders"
                    >
                      <FiPackage size={26} />
                    </button>


                  </div>

                  {/* Mobile Specific Icons Row (Right aligned) */}
                  <div className="flex items-center gap-4 sm:hidden">

                    {/* User Button Wrapper with Relative Positioning */}
                    <div className="relative">
                      <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`relative z-[101] w-14 h-14 rounded-xl flex items-center justify-center transition-all border ${isProfileOpen ? "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)]"}`}
                      >
                        <FiUser size={28} />
                      </button>

                      {/* Dropdown Content - Positioned relative to User Button */}
                      {isProfileOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100] w-[85vw] max-w-[300px]">
                          <div className="rounded-3xl shadow-2xl border-2 border-[var(--border-default)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 bg-[var(--surface-card)]">
                            <div className="p-5 border-b border-[var(--border-default)] bg-[var(--surface-muted)]">
                              <p className="text-xs font-black uppercase tracking-widest mb-1 text-[var(--text-secondary)]">Current User</p>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 shrink-0 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[var(--text-inverse)] font-black text-base shadow-lg shadow-[var(--brand-primary)]/30">
                                  {(user?.username || user?.emp_code || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-base leading-tight text-[var(--text-primary)] truncate">
                                    {user?.username || user?.first_name || "Guest User"}
                                  </p>
                                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 bg-[var(--text-primary)]/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                    {((user?.role?.toLowerCase() === 'employee') || user?.emp_code) ? "Employee" : (user?.role || "Kiosk")} • {user?.emp_code || user?.code || "ID: --"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/kiosk/meal-plan')}
                      className="w-14 h-14 rounded-xl flex items-center justify-center transition-all border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] shadow-sm"
                    >
                      <FiMenu size={28} />
                    </button>

                    <button
                      onClick={() => navigate('/kiosk/my-orders')}
                      className="w-14 h-14 rounded-xl flex items-center justify-center transition-all border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] shadow-sm"
                    >
                      <FiPackage size={28} />
                    </button>

                    {/* Mobile Backdrop */}
                    {isProfileOpen && (
                      <div
                        className="fixed inset-0 z-[90] bg-black/5 backdrop-blur-[1px]"
                        onClick={() => setIsProfileOpen(false)}
                      />
                    )}

                  </div>

                </div>
              </div>
            </div>


          </div>

          {/* RECOMMENDED SECTION */}
          {(recommended.length > 0 || loadingRecs) && (
            <div className="mb-8 animate-slide-up">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text">Recommended</span>
                <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-muted)] px-3 py-1 rounded-full border border-[var(--border-default)] uppercase tracking-wider">
                  Based on your orders
                </span>
              </h2>

              {loadingRecs ? (
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-40 h-56 rounded-2xl bg-[var(--surface-muted)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {recommended.map((product, index) => {
                    const qty = getProductTotalQty(product.id);
                    return (
                      <div
                        key={`rec-${product.id}`}
                        className="group relative flex flex-col overflow-hidden transition-all duration-300 bg-[var(--surface-card)] rounded-xl sm:rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 hover:shadow-lg"
                      >
                        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-lg shadow-orange-500/20">
                          Top Pick
                        </div>

                        <div className="relative aspect-square overflow-hidden bg-[var(--surface-muted)]">
                          <img
                            src={(() => {
                              const imgUrl = product.images?.[0]?.url || product.image || product.image_path;
                              if (!imgUrl) return noImage;
                              return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
                                ? imgUrl
                                : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                            })()}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => (e.target.src = noImage)}
                            alt={product.name}
                          />
                        </div>

                        <div className="p-3 flex flex-col gap-1 flex-1">
                          <div className="font-semibold text-xs sm:text-sm capitalize leading-tight text-[var(--text-primary)] line-clamp-1">
                            {product.name_en || product.name}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-[var(--brand-primary)] mb-2">
                            ₹{parseFloat(product.price || product.base_price || 0).toFixed(2)}
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2">
                            {qty === 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  adjustProductQuantity(product, 1, product.id);
                                }}
                                className="w-full py-2 rounded-lg bg-[var(--surface-muted)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--brand-primary)] hover:text-white transition-all active:scale-95 border border-[var(--border-default)] uppercase tracking-wider"
                              >
                                ADD
                              </button>
                            ) : (
                              <div className="flex items-center justify-between w-full bg-[var(--brand-primary)]/10 rounded-lg p-1 border border-[var(--brand-primary)]/20">
                                <button
                                  onClick={() => adjustProductQuantity(product, -1, product.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm hover:scale-105 active:scale-90 transition-all"
                                >
                                  <FaMinus size={10} />
                                </button>
                                <span className="font-bold text-xs">{qty}</span>
                                <button
                                  onClick={() => adjustProductQuantity(product, 1, product.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--brand-primary)] text-white shadow-sm hover:scale-105 active:scale-90 transition-all shadow-[var(--brand-primary)]/30"
                                >
                                  <FaPlus size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SELECT PRODUCTS HEADER - Like reference image */}
          <div className="relative z-30 mb-6">
            <div className="flex items-center justify-between gap-4 py-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Select Items
              </h2>
              <div className="flex items-center gap-3">
                {/* Card/List Toggle */}
                <div className="flex items-center bg-[var(--surface-muted)] rounded-xl p-1 border border-[var(--border-default)]">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === "card" ? "bg-[var(--brand-primary)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                  >
                    <FaTh size={12} /> Card
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-[var(--brand-primary)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                  >
                    <FaList size={12} /> List
                  </button>
                </div>
                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  disabled={totalSelectedCount === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${totalSelectedCount > 0 ? "bg-[var(--brand-primary)] text-white hover:brightness-110 active:scale-95" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] cursor-not-allowed"}`}
                >
                  Continue ({totalSelectedCount})
                </button>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="text-center text-[var(--brand-primary)] font-medium uppercase tracking-[0.2em] py-20 px-4 bg-[var(--surface-muted)] rounded-[2rem] border border-[var(--border-default)]">
              <div className="text-6xl mb-4 opacity-20">?!</div>
              {error}
            </div>
          )}

          {/* CARD VIEW - With +/- quantity controls like reference image */}
          {viewMode === "card" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 pb-24">
              {products.map((product, index) => {
                const qty = productQuantities[product.id] || 0;

                return (
                  <div
                    key={product.id}
                    style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
                    className="opacity-0 animate-slide-up flex flex-col h-full overflow-hidden transition-all duration-300 bg-[var(--surface-card)] rounded-xl sm:rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 hover:shadow-lg"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-[var(--surface-muted)] rounded-t-xl sm:rounded-t-2xl">
                      <img
                        src={(() => {
                          const imgUrl = product.images?.[0]?.url || product.image || product.image_path;
                          if (!imgUrl) return noImage;
                          return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
                            ? imgUrl
                            : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                        })()}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target.src = noImage)}
                        alt={product.name_en || product.name}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-2 sm:p-3 flex flex-col gap-0.5 flex-1">
                      <div className="font-semibold text-[11px] sm:text-xs md:text-sm capitalize leading-tight text-[var(--text-primary)] line-clamp-2">
                        {(product.name_en || product.name)?.toLowerCase()}
                        {product.name_ta && (
                          <span className="text-[var(--text-secondary)] font-normal"> | {product.name_ta}</span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-[var(--brand-primary)]">
                        ₹{parseFloat(product.price || product.base_price || 0).toFixed(2)}
                      </div>

                      {/* Quantity Controls - +/- buttons */}
                      <div className="flex items-center justify-between mt-auto pt-1.5 bg-[var(--surface-muted)] rounded-xl sm:rounded-2xl p-1 sm:p-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (qty > 0) adjustProductQuantity(product, -1, product.id);
                          }}
                          disabled={qty === 0}
                          className={`w-16 h-16 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl transition-all ${qty > 0 ? "bg-white text-[var(--text-primary)] shadow-sm hover:bg-gray-100 active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                        >
                          <FaMinus className="w-10 h-10 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                        </button>
                        <span className="min-w-[2rem] text-center text-2xl sm:text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                          {qty}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustProductQuantity(product, 1, product.id);
                          }}
                          className="w-16 h-16 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                        >
                          <FaPlus className="w-10 h-10 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW - Like reference image */}
          {viewMode === "list" && (
            <div className="space-y-2 pb-24">
              {products.map((product, index) => {
                const qty = productQuantities[product.id] || 0;

                return (
                  <div
                    key={product.id}
                    style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
                    className="opacity-0 animate-slide-up flex items-center gap-4 py-3 border-b border-[var(--border-default)] transition-all"
                  >
                    {/* Small Product Image */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[var(--surface-muted)]">
                      <img
                        src={(() => {
                          const imgUrl = product.images?.[0]?.url || product.image || product.image_path;
                          if (!imgUrl) return noImage;
                          return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
                            ? imgUrl
                            : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                        })()}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target.src = noImage)}
                        alt={product.name_en || product.name}
                      />
                    </div>

                    {/* Product Name + Tamil Name + Price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-1">
                        <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)] capitalize">
                          {(product.name_en || product.name)?.toLowerCase()}
                        </span>
                        {product.name_ta && (
                          <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                            | {product.name_ta}
                          </span>
                        )}
                        <span className="text-xs sm:text-sm text-[var(--text-secondary)]">|</span>
                        <span className="font-bold text-sm sm:text-base text-[var(--brand-primary)]">
                          ₹{parseFloat(product.price || product.base_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* +/- Quantity Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (qty > 0) adjustProductQuantity(product, -1, product.id);
                        }}
                        disabled={qty === 0}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold transition-all ${qty > 0 ? "bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-gray-200 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-lg font-bold text-[var(--text-primary)]">
                        {qty}
                      </span>
                      <button
                        onClick={() => adjustProductQuantity(product, 1, product.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white text-lg font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Standardized Pagination (Logs Style) */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-[var(--border-default)] pt-8">
              <div className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                Showing <span className="text-[var(--text-primary)]">{(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalProducts)}</span> of <span className="text-[var(--brand-primary)] font-black">{totalProducts}</span> records
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-default)] transition-all shadow-sm font-medium text-[10px] uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <FiChevronLeft size={16} /> Back
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isSelected = currentPage === pageNum;
                      if (totalPages > 5 && (pageNum > 1 && pageNum < totalPages && Math.abs(pageNum - currentPage) > 1)) {
                        if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1 text-[var(--text-secondary)]">...</span>;
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all border
                            ${isSelected
                              ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--text-inverse)] shadow-lg shadow-[var(--brand-primary)]/20 scale-105"
                              : "bg-[var(--surface-muted)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-default)] transition-all shadow-sm font-medium text-[10px] uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>

                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLimitDropdown(!showLimitDropdown);
                    }}
                    className={`bg-[var(--surface-muted)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--brand-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center gap-2 min-w-[120px] hover:bg-[var(--surface-card)]
                      ${showLimitDropdown ? 'border-[var(--brand-primary)]/50 bg-[var(--surface-card)]' : ''}`}
                  >
                    {limit} Pages
                    <FiChevronDown size={14} className={`transition-transform duration-300 ${showLimitDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showLimitDropdown && (
                    <div className="absolute bottom-full left-0 mb-3 w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-[100] py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {[10, 20, 50, 100].map(l => (
                        <button
                          key={l}
                          onClick={() => {
                            setLimit(l);
                            setCurrentPage(1);
                            setShowLimitDropdown(false);
                          }}
                          className={`w-full py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest transition-all
                            ${limit === l
                              ? "bg-[var(--brand-primary)] text-[var(--text-inverse)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"}`}
                        >
                          {l} Pages
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* CART DRAWER - Commented out as per user request, now using direct +/- on cards */}
        {/* 
        {isCartOpen && (
          <div className="fixed inset-0 z-[120] overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <div className="w-screen max-w-full sm:max-w-md transform transition ease-in-out duration-500 sm:duration-700 translate-x-0 bg-[var(--surface-card)] shadow-2xl border-l border-[var(--border-default)]">
                <div className="h-full flex flex-col py-6 bg-opacity-95 shadow-xl">
                  <div className="px-6 flex items-center justify-between border-b pb-6 border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-[var(--text-inverse)] shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                        <FiShoppingCart size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-medium text-[var(--text-primary)]">Your Cart</h2>
                        <p className="text-[10px] font-medium text-[var(--text-secondary)]">{totalSelectedCount} Items Selected</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="w-14 h-14 rounded-full flex items-center justify-center hover:bg-[var(--surface-muted)] transition-colors bg-[var(--surface-main)] border border-[var(--border-default)] shadow-lg active:scale-95"
                    >
                      <FaTimes size={28} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
                    {selectedProducts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 text-[var(--text-primary)]">
                        <FiShoppingCart size={64} />
                        <p className="font-semibold uppercase tracking-widest">Nothing here yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {selectedProducts.map((item, idx) => (
                          <CartItem
                            key={`${item.id}-${idx}`}
                            item={item}
                            adjustProductQuantity={adjustProductQuantity}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="px-6 pt-6 border-t border-[var(--border-default)] space-y-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-[var(--text-secondary)]">Total Payable</span>
                          <span className="text-3xl font-semibold text-[var(--brand-primary)]">₹{calculatePerDayTotal().toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] capitalize">Prices are inclusive of all taxes</p>
                      </div>
                      <button
                        onClick={handleContinue}
                        className="w-full py-5 rounded-[1.8rem] bg-[var(--brand-primary)] text-[var(--text-inverse)] font-semibold uppercase tracking-[0.2em] shadow-lg shadow-[var(--brand-primary)]/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-3 hover:brightness-110"
                      >
                        Proceed to Checkout
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        */}

        {/*
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] transition-all duration-500">
          ... (commented content) ...
        </div>
        */}

        {/* Meal Plan Modal */}


        {/* QR Scanner Modal */}


      </div>
    </Layout >
  );
};

export default ProductSelection;
