import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "../../context/OrderContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Layout from "../../components/Layout.jsx";
import Loading from "../../components/Loading.jsx";
import api, { API_BASE_URL } from "../../config/api.js";
import { FiArrowLeft, FiRefreshCw, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import noImage from "../../assets/No_image.png";

const generateOrderCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const CalendarSelection = () => {
  const {
    selectedUnit,
    selectedProducts,
    calculatePerDayTotal,
    setCurrentOrder,
    setProductQuantity, // Added for removal
  } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Helper for consistent local date strings
  const toLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper to check disabled status (Sundays, Past Dates, Today after 11:30 AM)
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getDay() === 0) return true; // Sunday
    if (checkDate < today) return true; // Past

    if (checkDate.getTime() === today.getTime()) {
      const now = new Date();
      // 11:30 cutoff
      if (now.getHours() > 11 || (now.getHours() === 11 && now.getMinutes() >= 30)) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    console.log("🛒 Current Cart in Summary:", selectedProducts);
  }, [selectedProducts]);

  const [loading, setLoading] = useState(false);
  const [appOrderId, setAppOrderId] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [orderCode, setOrderCode] = useState(user?.emp_code || "");
  const [addressDetails, setAddressDetails] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: ""
  });
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [lookingUpEmp, setLookingUpEmp] = useState(false);
  const [selectedDates, setSelectedDates] = useState(() => {
    const today = new Date();
    // Ensure we don't select today if it's disabled
    if (isDateDisabled(today)) return [];
    return [toLocalDateString(today)];
  });
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  // orderDate is now derived from selectedDates[0] if needed, or we use selectedDates array logic
  // orderDate is now derived from selectedDates[0] if needed, or we use selectedDates array logic
  const [orderDate, setOrderDate] = useState(toLocalDateString(new Date())); // Kept for compatibility if needed elsewhere

  const handleEmployeeLookup = async (codeToSearch) => {
    if (!codeToSearch || codeToSearch.length < 2) return;

    try {
      setLookingUpEmp(true);
      const res = await api.get(`/employees/?search=${codeToSearch}&limit=1000`);

      let employees = [];
      if (res.data && Array.isArray(res.data.employees)) {
        employees = res.data.employees;
      } else if (res.data && res.data.data) {
        employees = res.data.data;
      }

      // Find exact or close match
      const emp = employees.find(e =>
        (e.emp_code && String(e.emp_code).toLowerCase() === String(codeToSearch).toLowerCase()) ||
        (e.username && String(e.username).toLowerCase() === String(codeToSearch).toLowerCase())
      ) || employees[0];

      if (emp) {

        setAddressDetails({
          street: [emp.address, emp.address_line_2].filter(Boolean).join(", ") || emp.work_location || emp.base_location || "",
          city: emp.city || emp.district || "",
          state: emp.perm_state || emp.state || "",
          pincode: emp.pincode || "",
          country: emp.perm_country || emp.country || "India",
          phone: emp.mobile || emp.phone || ""
        });
      }
    } catch (err) {
      console.error("Error looking up employee:", err);
    } finally {
      setLookingUpEmp(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderCode && orderCode.length >= 2) {
        handleEmployeeLookup(orderCode);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [orderCode]);

  const handlePincodeChange = async (pin) => {
    setAddressDetails(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      setFetchingAddress(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await response.json();

        if (data[0].Status === "Success") {
          const postOffices = data[0].PostOffice[0];
          setAddressDetails(prev => ({
            ...prev,
            city: postOffices.District,
            state: postOffices.State,
            country: "India"
          }));
        }
      } catch (err) {
        console.error("Error fetching address details:", err);
      } finally {
        setFetchingAddress(false);
      }
    }
  };

  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () =>
      alert("Failed to load payment gateway. Refresh the page.");

    document.head.appendChild(script);
  }, []);

  const cancelPendingOrder = async (orderId) => {
    if (!orderId) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
    } catch (err) {
      console.error("Cancel order failed:", err);
    }
  };

  const handlePaymentInitiation = async () => {
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      navigate("/kiosk/products");
      return;
    }

    if (selectedDates.length === 0) {
      alert("Please select at least one date");
      return;
    }

    const trimmedCode = orderCode.trim() || `KIOSK-${Date.now()}`;

    if (!razorpayLoaded) {
      alert("Payment gateway is loading. Please wait...");
      return;
    }

    setLoading(true);
    let appOrder = null;

    try {
      // Backend expects variant_ids as an array
      const item_ids = selectedProducts.flatMap((p) =>
        Array(p.quantity || 1).fill(Number(p.id))
      );

      const delivery_address = addressDetails.street ? `${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state}, ${addressDetails.pincode}, ${addressDetails.country} - Phone: ${addressDetails.phone}`.trim().replace(/^, |, $/g, "") : "Kiosk Pickup";

      // Calculate grand total for all selected days
      const perDayAmount = Number(calculatePerDayTotal());
      const grandTotal = perDayAmount * selectedDates.length;

      const payload = {
        item_ids,
        payment_mode: "UPI",
        code: trimmedCode,
        total_amount: grandTotal, // Updated to use grand total
        emp_code: user?.emp_code || "ADMIN01",
        unit_id: selectedUnit?.id || user?.unit_id || selectedProducts[0]?.unit_id || 1,
        delivery_address,
        phone: addressDetails.phone || "0000000000",
        customer_phone: addressDetails.phone || "0000000000",
        employeeCode: user?.emp_code || "ADMIN01",
        deliveryAddress: delivery_address,
        orderDate: selectedDates[0], // Send first date as primary, ideally backend should handle array or we loop
        selectedDates: selectedDates, // Sending full array in case backend supports it
      };

      const response = await api.post("/orders", payload);
      const responseData = response.data;

      // V2 might return order_id, order: {id...}, or direct id
      const orderId =
        responseData?.order_id ||
        responseData?.order?.id ||
        responseData?.data?.id ||
        responseData?.id;
      const finalOrder =
        responseData?.order || responseData?.data || responseData;

      if (!orderId) {
        console.error("❌ Order ID extraction failed:", responseData);
        throw new Error("Failed to create order - ID missing");
      }

      setAppOrderId(orderId);

      // Normalize order object for Success page
      appOrder = finalOrder;
      if (appOrder) {
        if (!appOrder.id) appOrder.id = orderId;
        if (!appOrder.code) appOrder.code = trimmedCode;
        if (!appOrder.total_amount)
          appOrder.total_amount = Number(calculatePerDayTotal()) * selectedDates.length;
      }

      setCurrentOrder(appOrder);

      const totalAmountInPaise = Math.round(Number(calculatePerDayTotal()) * selectedDates.length * 100);

      const razorpayResponse = await api.post(
        `/orders/${orderId}/create-razorpay-order`,
        {
          order_id: orderId,
          amount: totalAmountInPaise,
          order_code: trimmedCode,
        }
      );

      console.log("Razorpay Response Data:", razorpayResponse.data);
      const { razorpay_order_id, order_id, amount, key, key_id, razorpay_key } =
        razorpayResponse.data;
      const finalKey = key || key_id || razorpay_key;
      const finalOrderId = razorpay_order_id || order_id;

      if (!finalKey) {
        console.error(
          "❌ Razorpay Key is missing from server response:",
          razorpayResponse.data
        );
        throw new Error("Payment initialization failed: API Key missing");
      }

      if (!finalOrderId) {
        console.error(
          "❌ Razorpay Order ID is missing from server response:",
          razorpayResponse.data
        );
        throw new Error("Payment initialization failed: Order ID missing");
      }

      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168');

      const options = {
        key: finalKey,
        amount,
        currency: "INR",
        name: "CMS",
        image: "",
        description: `Order #${orderId} - ${trimmedCode}`,
        order_id: finalOrderId,

        handler: async (response) => {
          try {
            console.log("🔍 Razorpay Handler Response:", response);
            console.log("📋 Payment ID:", response.razorpay_payment_id);
            console.log("📋 Order ID:", response.razorpay_order_id);
            console.log("📋 Signature:", response.razorpay_signature);

            // Validate all required fields are present
            if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
              console.error("❌ Missing required Razorpay response fields:", {
                payment_id: !!response.razorpay_payment_id,
                order_id: !!response.razorpay_order_id,
                signature: !!response.razorpay_signature
              });
              throw new Error("Incomplete payment response from Razorpay");
            }

            const verificationPayload = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            };

            console.log("📤 Sending verification payload:", verificationPayload);

            const verifyRes = await api.post(`/orders/${orderId}/verify-razorpay`, verificationPayload);

            console.log("✅ Verification Response:", verifyRes.data);

            // Extract QR code and other details from verification response
            const qrImage = verifyRes.data?.qrImage;
            const paymentDetails = verifyRes.data;

            setLoading(false);
            setAppOrderId(null);

            navigate("/kiosk/success", {
              state: {
                order: verifyRes.data?.order || { id: orderId, code: trimmedCode, total_amount: Number(calculatePerDayTotal()) },
                qrImage: qrImage,
                paymentDetails: paymentDetails
              },
            });
          } catch (err) {
            console.error(
              "❌ Payment verification failed:",
              err.response?.data || err
            );
            console.error("❌ Full error object:", err);
            setLoading(false);
            setAppOrderId(null);
            alert(`Payment verification failed: ${err.response?.data?.error || err.message}`);
          }
        },

        prefill: {
          contact: "9999999999",
          email: "admin@cms.com",
          vpa: "success@razorpay",
        },

        display: {
          blocks: {
            upi: {
              name: "UPI",
              instruments: [{ method: "upi", types: ["qr"] }],
            },
            ...(isLocalhost ? {} : {
              googlepay: {
                name: "Google Pay",
                instruments: [{ method: "googlepay" }],
              },
            }),
            netbanking: {
              name: "Net Banking",
              instruments: [{ method: "netbanking" }],
            },
          },
          sequence: isLocalhost
            ? ["block.upi", "block.netbanking"]
            : ["block.upi", "block.googlepay", "block.netbanking"],
          preferences: {
            show_default_blocks: true,
          },
        },

        modal: {
          ondismiss: async () => {
            await cancelPendingOrder(orderId);
            setLoading(false);
            setAppOrderId(null);
          },
        },

        theme: { color: "#fac639" },
      };

      if (typeof window.Razorpay === "undefined") {
        throw new Error("Razorpay script not loaded properly");
      }

      new window.Razorpay(options).open();
    } catch (error) {
      console.error("Payment Initiation Error:", error);
      setLoading(false);
      setAppOrderId(null);
      const orderData = appOrder || {};
      if (orderData.id) await cancelPendingOrder(orderData.id);
      alert(error.response?.data?.error || "Payment failed");
    }
  };

  const perDayTotal = calculatePerDayTotal();
  const isContinueDisabled = loading;

  if (loading && appOrderId) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="min-h-screen flex items-start sm:items-center justify-center overflow-y-auto p-2 sm:p-6 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar"
      >
        <div
          className="w-full max-w-lg md:max-w-4xl p-3 sm:p-6 md:p-10 rounded-3xl shadow-xl transition-all duration-300 bg-[var(--surface-card)] border border-[var(--border-default)] animate-scale-in"
        >
          <div className="flex items-center gap-4 mb-4 sm:mb-10">
            <button
              onClick={() => navigate("/kiosk/products")}
              className="p-2 rounded-xl transition-all active:scale-95 bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-main)]"
            >
              <FiArrowLeft size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold truncate text-[var(--text-primary)]">
                Order Summary
              </h1>
              <p
                className="text-[10px] sm:text-xs md:text-sm truncate text-[var(--text-secondary)]"
              >
                Review details and proceed to payment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Custom Calendar UI */}
            <div className="bg-[var(--surface-main)] rounded-[2rem] p-6 border border-[var(--border-default)] shadow-sm transition-colors duration-200">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))}
                  className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-full transition-colors"
                >
                  <FiChevronLeft className="text-xl" />
                </button>

                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>

                <button
                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))}
                  className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-full transition-colors"
                >
                  <FiChevronRight className="text-xl" />
                </button>
              </div>

              <div className="flex justify-center mb-6">
                <label className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--brand-primary)] transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                    checked={(() => {
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      let validDaysCount = 0;
                      let selectedValidCount = 0;

                      for (let i = 1; i <= daysInMonth; i++) {
                        const date = new Date(year, month, i);
                        if (!isDateDisabled(date)) {
                          validDaysCount++;
                          const d = toLocalDateString(date);
                          if (selectedDates.includes(d)) {
                            selectedValidCount++;
                          }
                        }
                      }
                      return validDaysCount > 0 && validDaysCount === selectedValidCount;
                    })()}
                    onChange={(e) => {
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();

                      if (e.target.checked) {
                        const newSelection = new Set(selectedDates);
                        for (let i = 1; i <= daysInMonth; i++) {
                          const date = new Date(year, month, i);
                          if (!isDateDisabled(date)) {
                            newSelection.add(toLocalDateString(date));
                          }
                        }
                        setSelectedDates(Array.from(newSelection));
                      } else {
                        const toRemove = [];
                        for (let i = 1; i <= daysInMonth; i++) {
                          toRemove.push(toLocalDateString(new Date(year, month, i)));
                        }
                        setSelectedDates(selectedDates.filter(d => !toRemove.includes(d)));
                      }
                    }}
                  />
                  <span>Select all</span>
                </label>
              </div>

              <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-bold text-[var(--text-secondary)] py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {(() => {
                  const year = calendarViewDate.getFullYear();
                  const month = calendarViewDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const days = [];

                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="h-9 sm:h-12" />);
                  }

                  for (let i = 1; i <= daysInMonth; i++) {
                    const currentDate = new Date(year, month, i);
                    const dateString = toLocalDateString(currentDate);
                    const isDisabled = isDateDisabled(currentDate);
                    const isSelected = selectedDates.includes(dateString);
                    const isToday = dateString === toLocalDateString(new Date());

                    days.push(
                      <button
                        key={i}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          if (isSelected) {
                            setSelectedDates(selectedDates.filter(d => d !== dateString));
                          } else {
                            setSelectedDates([...selectedDates, dateString]);
                          }
                        }}
                        className={`h-9 sm:h-12 rounded-xl sm:rounded-2xl text-sm sm:text-lg font-bold transition-all flex items-center justify-center ${isSelected
                          ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/30 scale-105'
                          : isToday && !isDisabled
                            ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                            : isDisabled
                              ? 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed bg-[var(--surface-muted)]/50'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                          }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  Selected days: <span className="font-black text-[2rem] ml-2">{selectedDates.length}</span>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Product List - Compact */}
              {selectedProducts.length > 0 && (
                <div className="mb-6 space-y-3">
                  {selectedProducts.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-3 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] group">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setProductQuantity(p, 0)}
                          className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          aria-label="Remove item"
                        >
                          <FiX size={14} />
                        </button>
                        <div className="font-bold text-[var(--text-primary)] break-words min-w-0">
                          {p.name_en || p.name_ta || p.name || "Item"}
                          <span className="text-[var(--brand-primary)] ml-2 whitespace-nowrap">x{p.quantity}</span>
                        </div>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2">₹{(p.price || p.base_price) * p.quantity}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-white border border-[var(--border-default)] flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">Per Day Total</span>
                  <span className="text-2xl font-black text-[var(--brand-primary)]">₹{perDayTotal.toFixed(2)}</span>
                </div>
                <div className="p-6 rounded-[2rem] bg-white border border-[var(--border-default)] flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">Selected Days</span>
                  <span className="text-2xl font-black text-[var(--text-primary)]">{selectedDates.length}</span>
                </div>
              </div>

              <div className="p-6 sm:p-8 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed bg-[var(--surface-muted)] border-[var(--border-default)]">
                <span className="text-xs font-black opacity-50 mb-2 uppercase tracking-[0.3em] text-[var(--text-secondary)]">Grand Total</span>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter">
                  ₹{(perDayTotal * selectedDates.length).toFixed(0)}
                </div>
              </div>

              <button
                onClick={handlePaymentInitiation}
                disabled={isContinueDisabled || selectedDates.length === 0}
                className="w-full py-5 text-lg font-bold rounded-xl shadow-xl transform transition-all active:scale-[0.98] bg-[var(--brand-primary)] text-[var(--text-inverse)] hover:brightness-110 shadow-[var(--brand-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : `Continue (${selectedDates.length} days)`}
              </button>
            </div>
          </div>
        </div >
      </div >
    </Layout >
  );
};

export default CalendarSelection;
