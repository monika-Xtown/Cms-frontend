import { useState, useEffect, useCallback, useMemo } from "react";
import api, { API_BASE_URL } from "../../config/api.js";
import AdminLayout from "../../components/AdminLayout.jsx";
import Loading from "../../components/Loading.jsx";
import { FaEdit, FaPlus, FaTrash, FaCheck, FaFileUpload, FaDownload } from "react-icons/fa";
import {
  FiX,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext.jsx";
import noImage from "../../assets/No_image.png";
import { useAuth } from "../../context/AuthContext.jsx";

const Products = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]); // Kept for transition, but we'll use paginatedProducts
  const [units, setUnits] = useState([]);
  const { isDark } = useTheme();
  const { user } = useAuth();

  const canModify = user?.role === 'admin' || user?.role === 'unit_admin';

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  // Form State
  const initialFormState = {
    name_en: "",
    name_ta: "",
    description_en: "",
    description_ta: "",
    category: "General",
    price: "",
    images: [],
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await api.get("/units");
      setUnits(res.data?.units || res.data || []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ALL items for client-side search/pagination
      const prodRes = await api.get("/items/", {
        params: { limit: 3000 },
      });

      let fetchedProducts = prodRes.data?.items || prodRes.data?.data || [];

      if (user?.role === 'unit_admin' && user?.unit_id) {
        fetchedProducts = fetchedProducts.filter(p => p.unit_id === user.unit_id);
      }

      setAllProducts(fetchedProducts);
      // setTotalProduct count is now dynamic based on filter
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Run once on mount/refresh

  // Client-side Filter & Pagination Logic
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    const lowerTerm = searchTerm.toLowerCase();
    return allProducts.filter(p =>
      (p.name_en || "").toLowerCase().includes(lowerTerm) ||
      (p.name || "").toLowerCase().includes(lowerTerm) ||
      (p.name_ta || "").toLowerCase().includes(lowerTerm)
    );
  }, [allProducts, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, currentPage, limit]);

  // Update totals for pagination UI
  useEffect(() => {
    setTotalProducts(filteredProducts.length);
    setTotalPages(Math.ceil(filteredProducts.length / limit) || 1);
  }, [filteredProducts, limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      // Populate Form
      setFormData({
        name_en: product.name_en || product.name || "",
        name_ta: product.name_ta || product.slug_url || product.slug || "",
        description_en: product.description_en || product.description || "",
        description_ta: product.description_ta || "",
        category: product.category || product.category_id || "General",
        price: product.price || product.base_price || "",
        images:
          product.images && product.images.length > 0
            ? product.images.map((img) => ({
              ...img,
              url: img.url || img.image_path || "",
              is_primary: !!img.is_primary,
            }))
            : product.image || product.image_path
              ? [{ url: product.image || product.image_path, is_primary: true }]
              : [],
        is_active: product.is_active ?? true, // ✅ important

      });
    } else {
      // Reset
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  // Image Handling - Simplified for single image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newImage = {
      url: URL.createObjectURL(file),
      file,
      is_primary: true,
    };

    setFormData((prev) => ({
      ...prev,
      images: [newImage], // Replace with single image
    }));
    e.target.value = "";
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      if (newImages.length > 0 && !newImages.some((img) => img.is_primary)) {
        newImages[0].is_primary = true;
      }
      return { ...prev, images: newImages };
    });
  };

  const setPrimaryImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      })),
    }));
  };

  // Bulk Upload Logic
  const handleTemplateDownload = () => {
    const headers = [
      "name_en",
      "name_ta",
      "price",
      "description_en",
      "description_ta",
      "category",
      "unit_id",
      "is_veg",
      "is_active"
    ];
    const sampleData = [
      "Sample Product,மாதிரி தயாரிப்பு,100,Description,விளக்கம்,General,1,true,true"
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...sampleData].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSubmitting(true);
      await api.post('/items/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert("Bulk upload successful!");
      setShowBulkModal(false);
      fetchData();
    } catch (err) {
      console.error("Bulk upload failed:", err);
      alert(err.response?.data?.message || "Bulk upload failed. Please check the file format.");
    } finally {
      setSubmitting(false);
      e.target.value = ''; // Reset input
    }
  };

  // Selection Logic

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (
      !formData.name_en ||
      !formData.name_ta ||
      !formData.price
      // !formData.unit_id
    ) {
      alert("English Name, Tamil Name, and Price are required");
      setSubmitting(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("name_en", formData.name_en);
      data.append("name_ta", formData.name_ta);
      data.append("description_en", formData.description_en || "");
      data.append("description_ta", formData.description_ta || "");
      data.append("category", formData.category || "General");
      data.append("price", Number(formData.price) || 0);
      data.append("is_active", formData.is_active); // ✅ added

      const primaryImage =
        formData.images.find((img) => img.is_primary) || formData.images[0];
      if (primaryImage) {
        if (primaryImage.file instanceof File) {
          data.append("image", primaryImage.file);
        } else if (typeof primaryImage.url === "string") {
          data.append("image", primaryImage.url);
        }
      }

      if (editingProduct) {
        await api.put(`/items/${editingProduct.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/items/", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Product saved successfully!");
      closeModal();
      fetchData();
    } catch (err) {
      console.error("Save Error:", err);
      alert(err.response?.data?.details || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/items/${id}`);
      fetchData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const getCategoryName = (product) =>
    product.category || product.category_id || "General";

  const getUnitName = (unitId) => {
    if (!unitId) return "";
    const u = units.find((u) => u.id === Number(unitId));
    return u ? (u.unit_name || u.name) : "";
  };

  const getUnitCode = (unitId) => {
    if (!unitId) return "";
    const u = units.find((u) => u.id === Number(unitId));
    return u ? u.code : "";
  };

  if (loading && !showModal)
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10 sm:mb-14">
          <div className="flex flex-col gap-6 w-full lg:w-auto">
            {/* Title */}
            <div className="flex items-center gap-4 shrink-0 animate-slide-up opacity-0">
              <div className="w-1.5 h-10 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
                {"Items".split("").map((char, i) => (
                  <span
                    key={i}
                    className="animate-letter-pop"
                    style={{
                      animationDelay: `${600 + (char === " " ? 0 : i * 50)}ms`,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </h1>
            </div>

            {/* Search Bar - Moved below Title as per user request */}
            <div
              style={{ animationDelay: "100ms" }}
              className="relative w-full sm:w-[400px] group animate-slide-up opacity-0"
            >
              <input
                type="text"
                placeholder="Search Items..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-14 pr-14 py-4 text-center rounded-3xl border-2 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-8 focus:ring-[var(--brand-primary)]/5 focus:border-[var(--brand-primary)] font-bold text-sm sm:text-base transition-all shadow-xl hover:border-[var(--brand-primary)]/30 group-hover:translate-x-1 duration-300 placeholder:text-center"
              />
              <FiSearch
                className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within:opacity-100 group-focus-within:text-[var(--brand-primary)] transition-all"
                size={26}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            {canModify && (
              <button
                onClick={() => openModal()}
                className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-8 py-3.5 landscape:py-1 landscape:h-8 landscape:px-4 rounded-2xl flex items-center justify-center gap-3 landscape:gap-1.5 transition-all shadow-lg hover:shadow-[var(--brand-primary)]/10 hover:-translate-y-1 active:scale-95 text-xs sm:text-sm landscape:text-[10px] uppercase tracking-widest"
              >
                <FaPlus size={26} className="landscape:w-4 landscape:h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {paginatedProducts.map((p, index) => (
            <div
              key={p.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="group relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[1.5rem] overflow-hidden transition-all duration-300 flex flex-col animate-scale-in opacity-0 md:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] md:hover:border-[var(--brand-primary)]/40 md:hover:-translate-y-1.5 active:scale-95 active:shadow-sm"
            >
              {/* Product Image Holder */}
              <div className="aspect-square bg-gray-50/50 p-4 relative overflow-hidden flex items-center justify-center">
                <img
                  src={(() => {
                    // Try to find image in various locations
                    const img =
                      p.images?.[0]?.url ||
                      p.images?.[0]?.image_path ||
                      p.image ||
                      p.image_path;

                    if (!img) return noImage;

                    // If it's already a full URL or blob
                    if (img.startsWith("http") || img.startsWith("blob:")) return img;

                    // Construct URL
                    const cleanPath = img.startsWith("/") ? img.substring(1) : img;
                    return `${API_BASE_URL}/${cleanPath}`;
                  })()}
                  alt={p.name_en || p.name}
                  title={(() => {
                    const img = p.images?.[0]?.url || p.images?.[0]?.image_path || p.image || p.image_path;
                    return img ? `Source: ${img}` : 'No image source';
                  })()}
                  className="w-full h-full object-contain transition-transform duration-500 ease-out"
                  onError={(e) => {
                    console.error("Image load failed:", e.target.src);
                    e.target.src = noImage;
                  }}
                />


                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-[var(--brand-primary)] border border-[var(--brand-primary)]/10 shadow-sm">
                  {getCategoryName(p)}
                </div>

                {/* Veg/Non-Veg Icon */}
                <div
                  className={`absolute top-3 right-3 w-4 h-4 border-2 rounded flex items-center justify-center ${p.is_veg ? "border-emerald-500" : "border-red-500"
                    }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${p.is_veg ? "bg-emerald-500" : "bg-red-500"
                      }`}
                  ></div>
                </div>

                {/* Status Overlay */}
                {!p.is_active && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-lg rotate-12">
                      INACTIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-5 flex flex-col flex-1">
                <div className="mb-3">
                  <h3 className="font-black text-base text-[var(--text-primary)] truncate capitalize leading-tight">
                    {p.name_en || p.name}
                  </h3>
                  <p className="text-sm font-bold text-[var(--text-secondary)] truncate">
                    {p.name_ta}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest">
                      Price
                    </span>
                    <span className="text-lg font-black text-[var(--text-primary)] tracking-tighter">
                      ₹{parseFloat(p.price || p.base_price).toFixed(2)}
                    </span>
                    <span className="text-xs font-black text-[var(--brand-primary)] mt-0.5">
                      {getUnitName(p.unit_id)} - {getUnitCode(p.unit_id)}
                    </span>
                  </div>

                  {canModify && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => openModal(p)}
                        className="w-14 h-14 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4)] transition-all active:scale-90"
                        title="Edit"
                      >
                        <FaEdit style={{ fontSize: "36px" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="w-14 h-14 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-[0_8px_16px_-4px_rgba(239,68,68,0.4)] transition-all active:scale-90"
                        title="Delete"
                      >
                        <FaTrash style={{ fontSize: "36px" }} />
                      </button>
                    </div>
                  )}
                </div>
                {/* Status */}

              </div>
            </div>
          ))}
        </div>

        {/* Card Style Pagination */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left: Product Count */}
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            Total{" "}
            <span className="text-[var(--text-primary)] font-bold">
              {totalProducts}
            </span>{" "}
            Items
          </div>

          {/* Center: Pagination Controls */}
          <div className="flex items-center gap-2 bg-[var(--surface-card)] p-1.5 rounded-2xl shadow-sm border border-[var(--border-default)]">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] disabled:opacity-30 transition-all font-bold text-xs uppercase"
            >
              <FiChevronLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  // Logic to hide extensive pages
                  if (
                    totalPages > 6 &&
                    pageNum > 1 &&
                    pageNum < totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1)
                      return (
                        <span
                          key={pageNum}
                          className="text-[var(--text-secondary)] opacity-40 px-1"
                        >
                          ...
                        </span>
                      );
                    return null;
                  }

                  const isSelected = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all
                      ${isSelected
                          ? "bg-[var(--brand-primary)] text-white shadow-md scale-105"
                          : "text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}
            </div>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages}
              className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] disabled:opacity-30 transition-all font-bold text-xs uppercase"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>

          {/* Right: Limit Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLimitDropdown(!showLimitDropdown);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/5 transition-all w-[130px] justify-center"
            >
              {limit} Pages
              <FiChevronDown className="text-[var(--brand-primary)]" />
            </button>
            {showLimitDropdown && (
              <div className="absolute bottom-full right-0 mb-2 w-[130px] bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-2xl shadow-xl overflow-hidden z-20 py-1">
                {[10, 20, 50, 100].map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLimit(l);
                      setCurrentPage(1);
                      setShowLimitDropdown(false);
                    }}
                    className={`w-full text-center py-2.5 text-xs font-bold transition-colors
                      ${limit === l
                        ? "bg-[var(--brand-primary)] text-white"
                        : "text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                      }
                    `}
                  >
                    {l} Pages
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 landscape:p-1 z-50 backdrop-blur-sm">
            <div className="bg-[var(--surface-card)] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-full">
              <div className="px-5 py-4 landscape:py-2 landscape:px-4 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-main)] shrink-0">
                <h2 className="text-xl landscape:text-base font-bold">
                  {editingProduct ? "Edit Item" : "Create Item"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 landscape:p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                  <FiX size={20} className="landscape:size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 landscape:p-3 custom-scrollbar">
                <form
                  id="productForm"
                  onSubmit={handleSubmit}
                  className="space-y-6 landscape:space-y-2"
                >
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 landscape:grid-cols-2 gap-4 landscape:gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500 mb-1 landscape:mb-0.5">
                        English Name
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name_en}
                        onChange={(e) => {
                          const val = e.target.value;
                          const capVal =
                            val.charAt(0).toUpperCase() + val.slice(1);
                          setFormData({ ...formData, name_en: capVal });
                        }}
                        className="w-full px-3 py-2 landscape:py-1.5 rounded-lg border bg-[var(--surface-main)] text-sm landscape:text-xs focus:border-[var(--brand-primary)] outline-none"
                        placeholder="Enter name"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500 mb-1 landscape:mb-0.5">
                        Tamil Name
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name_ta}
                        onChange={(e) =>
                          setFormData({ ...formData, name_ta: e.target.value })
                        }
                        className="w-full px-3 py-2 landscape:py-1.5 rounded-lg border bg-[var(--surface-main)] text-sm landscape:text-xs focus:border-[var(--brand-primary)] outline-none"
                        placeholder="Tamil name"
                      />
                    </div>
                    {/* <div className="md:col-span-1">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        English Description
                      </label>
                      <textarea
                        value={formData.description_en}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description_en: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border bg-[var(--surface-main)] text-sm focus:border-[var(--brand-primary)] outline-none"
                        placeholder="English description"
                        rows="1"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Tamil Description
                      </label>
                      <textarea
                        value={formData.description_ta}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description_ta: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border bg-[var(--surface-main)] text-sm focus:border-[var(--brand-primary)] outline-none"
                        placeholder="Tamil description"
                        rows="1"
                      />
                    </div> */}
                  </div>

                  {/* Price & Status Row */}
                  <div className="grid grid-cols-2 gap-4 landscape:gap-3 items-end">
                    <div>
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500 mb-1 landscape:mb-0.5">
                        Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm landscape:text-xs">
                          ₹
                        </span>
                        <input
                          required
                          type="number"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          className="w-full !pl-10 landscape:!pl-8 pr-3 py-2 landscape:py-1.5 rounded-lg border bg-[var(--surface-main)] text-sm landscape:text-xs focus:border-[var(--brand-primary)] outline-none"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500 mb-2 landscape:mb-1">
                        Status
                      </label>
                      <div className="flex items-center gap-3 landscape:gap-2">
                        <div
                          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                          className={`w-14 h-8 landscape:w-10 landscape:h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.is_active ? 'bg-[#4ade80]' : 'bg-gray-300'}`}
                        >
                          <div
                            className={`bg-white w-6 h-6 landscape:w-4 landscape:h-4 rounded-full shadow-none transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6 landscape:translate-x-4' : 'translate-x-0'}`}
                          />
                        </div>
                        <span className={`text-[10px] landscape:text-[8px] font-black uppercase tracking-widest ${formData.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Images - Simplified Single Upload */}
                  <div className="landscape:flex landscape:items-center landscape:gap-4">
                    <div className="flex justify-between items-end mb-2 landscape:mb-0">
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500">
                        Images
                      </label>
                      <span className="text-[10px] landscape:hidden text-gray-400 font-medium">
                        Maximum 4 images allowed
                      </span>
                    </div>

                    {formData.images.length > 0 ? (
                      <div className="relative w-full aspect-square max-w-[180px] landscape:max-w-[100px] rounded-xl border-2 border-gray-200 overflow-hidden group bg-gray-50">
                        <img
                          src={
                            formData.images[0].url.startsWith("blob:") ||
                              formData.images[0].url.startsWith("http")
                              ? formData.images[0].url
                              : `${API_BASE_URL}${formData.images[0].url.startsWith("/") ? "" : "/"
                              }${formData.images[0].url}`
                          }
                          alt="Product"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.target.src = noImage)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, images: [] })}
                            className="px-3 py-1.5 landscape:px-2 landscape:py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 font-bold text-xs landscape:text-[10px] flex items-center gap-1.5 landscape:gap-1"
                          >
                            <FaTrash size={12} className="landscape:size-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full aspect-square max-w-[180px] landscape:max-w-[100px] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--surface-muted)] hover:border-[var(--brand-primary)] transition-colors group">
                        <FaPlus
                          className="text-gray-400 group-hover:text-[var(--brand-primary)] mb-1.5 landscape:mb-0.5 landscape:size-4"
                          size={24}
                        />
                        <span className="text-xs landscape:text-[9px] text-gray-500 font-bold uppercase">
                          Add Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>

                  {/* Unit & Category */}
                  <div className="grid grid-cols-2 gap-4 landscape:gap-3">
                    <div>
                      <label className="block text-xs landscape:text-[10px] font-bold uppercase text-slate-500 mb-1 landscape:mb-0.5">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-2 landscape:py-1.5 rounded-lg border bg-[var(--surface-main)] text-sm landscape:text-xs focus:border-[var(--brand-primary)] outline-none"
                        placeholder="General"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-5 py-4 landscape:py-2 border-t flex justify-end gap-3 bg-[var(--surface-main)] shrink-0">
                <button
                  onClick={closeModal}
                  className={`px-5 py-2.5 landscape:py-1.5 rounded-xl border font-bold text-sm landscape:text-xs transition-all ${isDark
                    ? "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  Cancel
                </button>
                <button
                  form="productForm"
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 landscape:py-1.5 rounded-xl bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-bold text-sm landscape:text-xs shadow-lg transition-all active:scale-[0.98]"
                >
                  {submitting ? "Saving..." : "Save Item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Products;
