// import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import AdminLayout from "../../components/AdminLayout.jsx";
// import Loading from "../../components/Loading.jsx";
// import { useAuth } from "../../context/AuthContext.jsx";
// import api, { API_BASE_URL } from "../../config/api.js";
// import { useTheme } from "../../context/ThemeContext.jsx";
// import successGif from "../../assets/success.gif";
// import noImage from "../../assets/No_image.png";
// import QRScanner from "../../components/QRScanner";
// import { FiMenu, FiUser, FiLogOut, FiSearch, FiCheckCircle, FiPrinter, FiHome, FiRefreshCw, FiShoppingCart, FiPlusCircle, FiXCircle, FiChevronDown, FiChevronLeft, FiChevronRight, FiCamera, FiX, FiPackage } from "react-icons/fi";

// // ... [existing imports] ...


// import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";

// const AdminCheckout = () => {
//   const { user } = useAuth();
//   const { isDark } = useTheme();

//   // QR Scanner State
//   const [showScanner, setShowScanner] = useState(false);
//   const [scanResult, setScanResult] = useState(null);
//   const [scanError, setScanError] = useState(null);

//   const handleQRScan = async (decodedText) => {
//     setShowScanner(false);
//     setScanError(null);
//     setScanResult(null);

//     try {
//       // Extract Token
//       let qrToken = decodedText;
//       if (decodedText.includes('/qr-verify/')) {
//         qrToken = decodedText.split('/qr-verify/').pop();
//       }

//       // Verify with Backend
//       const res = await api.post(`/orders/scan-qr`, { token: qrToken });

//       if (res.data.success) {
//         setScanResult(res.data);
//       } else {
//         setScanError("Verification returned unsuccessful status");
//       }
//     } catch (err) {
//       console.error("QR Verification Error:", err);

//       // Try v2 fallback
//       try {
//         let qrToken = decodedText;
//         if (decodedText.includes('/qr-verify/')) qrToken = decodedText.split('/qr-verify/').pop();
//         const resV2 = await api.post(`/v2/orders/scan-qr`, { token: qrToken });
//         if (resV2.data.success) {
//           setScanResult(resV2.data);
//           return;
//         }
//       } catch (e) { /* Ignore */ }

//       const errorMsg = err.response?.data?.message || err.message || 'Verification Failed';
//       setScanError(errorMsg);

//       if (err.response?.data?.used_at) {
//         setScanError(`ALREADY VERIFIED at ${new Date(err.response.data.used_at).toLocaleString()}`);
//       }
//     }
//   };

//   const closeScanResult = () => {
//     setScanResult(null);
//     setScanError(null);
//   };
//   const navigate = useNavigate();

//   const [products, setProducts] = useState([]);
//   const [selectedProducts, setSelectedProducts] = useState([]);
//   const [paymentMode, setPaymentMode] = useState("UPI");
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [razorpayLoaded, setRazorpayLoaded] = useState(false);
//   const [appOrderId, setAppOrderId] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [isPopupOpen, setIsPopupOpen] = useState(false);
//   const [selectedPopupProduct, setSelectedPopupProduct] = useState(null);
//   const [popupQuantity, setPopupQuantity] = useState(1);

//   const [units, setUnits] = useState([]);
//   const [selectedUnit, setSelectedUnit] = useState("ALL");

//   const [paymentStatus, setPaymentStatus] = useState("IDLE");
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [qrCode, setQrCode] = useState(null);
//   const [fetchingQR, setFetchingQR] = useState(false);
//   const [qrUsed, setQrUsed] = useState(false);
//   const [printing, setPrinting] = useState(false);
//   const [printResults, setPrintResults] = useState([]);
//   const [printWarning, setPrintWarning] = useState(false);
//   const [fullOrderData, setFullOrderData] = useState(null);
//   const [dayBills, setDayBills] = useState([]);
//   const [countdown, setCountdown] = useState(3); // Auto-close countdown
//   const summaryRef = useRef(null);
//   const [showMobileTotal, setShowMobileTotal] = useState(false);
//   const [addressDetails, setAddressDetails] = useState({
//     street: "",
//     city: "",
//     state: "",
//     pincode: "",
//     country: "India",
//     phone: ""
//   });
//   /* Manual Entry Enforced: Default to empty string instead of user code */
//   const [clerkCode, setClerkCode] = useState("");
//   const [lookedUpEmployee, setLookedUpEmployee] = useState(null);
//   const [fetchingAddress, setFetchingAddress] = useState(false);
//   // Helper for consistent local date strings
//   const toLocalDateString = (date) => {
//     const y = date.getFullYear();
//     const m = String(date.getMonth() + 1).padStart(2, '0');
//     const d = String(date.getDate()).padStart(2, '0');
//     return `${y}-${m}-${d}`;
//   };

//   // Helper to check disabled status (Sundays, Past Dates, Today after 11:30 AM)
//   const isDateDisabled = (date) => {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const checkDate = new Date(date);
//     checkDate.setHours(0, 0, 0, 0);

//     if (checkDate.getDay() === 0) return true; // Sunday
//     if (checkDate < today) return true; // Past

//     if (checkDate.getTime() === today.getTime()) {
//       const now = new Date();
//       // 11:30 cutoff
//       if (now.getHours() > 11 || (now.getHours() === 11 && now.getMinutes() >= 30)) {
//         return true;
//       }
//     }

//     return false;
//   };

//   const [selectedDates, setSelectedDates] = useState(() => {
//     const today = new Date();
//     if (isDateDisabled(today)) return [];
//     return [toLocalDateString(today)];
//   });
//   const [calendarViewDate, setCalendarViewDate] = useState(new Date());
//   const [remarks, setRemarks] = useState("");

//   const handlePincodeChange = async (pin) => {
//     setAddressDetails(prev => ({ ...prev, pincode: pin }));

//     if (pin.length === 6) {
//       setFetchingAddress(true);
//       try {
//         const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
//         const data = await response.json();

//         if (data[0].Status === "Success") {
//           const postOffices = data[0].PostOffice[0];
//           setAddressDetails(prev => ({
//             ...prev,
//             city: postOffices.District,
//             state: postOffices.State,
//             country: "India"
//           }));
//         }
//       } catch (err) {
//         console.error("Error fetching address details:", err);
//       } finally {
//         setFetchingAddress(false);
//       }
//     }
//   };

//   // Removed separate state for lookup
//   const [lookingUpEmp, setLookingUpEmp] = useState(false);

//   // Auto-fill address when clerkCode changes (debounced)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (clerkCode && clerkCode.length >= 1) { // Changed from 3 to 1 to allow short codes
//         handleEmployeeLookup(clerkCode);
//       } else if (!clerkCode) {
//         // Clear address if code is cleared
//         setAddressDetails({
//           street: "",
//           city: "",
//           state: "",
//           pincode: "",
//           country: "India",
//           phone: ""
//         });
//       }
//     }, 1000); // Keep debounce to avoid spamming while typing
//     return () => clearTimeout(timer);
//   }, [clerkCode]);

//   useEffect(() => {
//     setShowMobileTotal(selectedProducts.length > 0);
//   }, [selectedProducts]);

//   const scrollToSummary = () => {
//     summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
//   };

//   const handleEmployeeLookup = async (codeToSearch) => {
//     if (!codeToSearch) return;
//     setLookingUpEmp(true);
//     try {
//       const res = await api.get(`/employees?search=${codeToSearch}`);
//       let employees = [];
//       if (res.data && Array.isArray(res.data.employees)) {
//         employees = res.data.employees;
//       } else if (res.data && Array.isArray(res.data)) {
//         employees = res.data;
//       } else if (res.data && res.data.data) {
//         employees = res.data.data;
//       }

//       // Find exact or close match
//       const emp = employees.find(e =>
//         (e.emp_code && e.emp_code.toLowerCase() === codeToSearch.toLowerCase()) ||
//         (e.username && e.username.toLowerCase() === codeToSearch.toLowerCase())
//       ) || employees[0];

//       if (emp) {
//         setClerkCode(emp.emp_code || "");
//         setLookedUpEmployee(emp);
//         setAddressDetails({
//           street: [emp.address, emp.address_line_2].filter(Boolean).join(", ") || emp.work_location || emp.base_location || "",
//           city: emp.city || emp.district || "",
//           state: emp.perm_state || emp.state || "",
//           pincode: emp.pincode || "",
//           country: emp.perm_country || emp.country || "India",
//           phone: emp.mobile || emp.phone || ""
//         });
//       } else {
//         setLookedUpEmployee(null);
//       }
//     } catch (err) {
//       console.error("Error looking up employee:", err);
//     } finally {
//       setLookingUpEmp(false);
//     }
//   };

//   const fetchQRCode = async (orderId) => {
//     if (!orderId) return;

//     // If already marked used, don't keep fetching
//     if (qrUsed) return;

//     setFetchingQR(true);
//     try {
//       const res = await api.get(`/orders/${orderId}/qr`);
//       console.log('QR Polling Response:', res.data);

//       // Detection of usage
//       if (res.data?.is_used) {
//         setQrUsed(true);
//         setQrCode(null);
//         console.log('QR marked as used by backend');
//       } else if (res.data?.qrImage) {
//         setQrCode(res.data.qrImage);
//       }
//     } catch (err) {
//       console.error("Error fetching QR Code:", err);
//     } finally {
//       setFetchingQR(false);
//     }
//   };
//   const handleSubmit = async () => {
//     if (!selectedProducts.length) {
//       alert("Select at least one product");
//       return;
//     }

//     if (paymentMode === "UPI" && !razorpayLoaded) {
//       alert("Payment gateway is loading. Please wait...");
//       return;
//     }

//     if (!selectedDates || selectedDates.length === 0) {
//       alert("Please select at least one date from the calendar");
//       return;
//     }

//     try {
//       setSubmitting(true);

//       const code = `ADM-${Date.now()}`;
//       const item_ids = selectedProducts.flatMap((p) =>
//         Array(p.quantity || 1).fill(Number(p.id))
//       );
//       const total_amount = calculateTotal();

//       const delivery_address = `${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state}, ${addressDetails.pincode}, ${addressDetails.country} - Phone: ${addressDetails.phone}`.trim().replace(/^, |, $/g, "");

//       // Resolve unit_id from lookedUpEmployee.division_unit (which might be a name or code)
//       // Match it against the units list to get the numeric ID
//       const matchedUnit = units.find(u =>
//         u.id === Number(lookedUpEmployee?.division_unit) ||
//         u.name === lookedUpEmployee?.division_unit ||
//         u.code === lookedUpEmployee?.division_unit
//       );

//       // Robust fallback sequence for unit_id
//       let finalUnitId = 1; // Start with Master Unit as ultimate fallback
//       if (matchedUnit?.id) {
//         finalUnitId = Number(matchedUnit.id);
//       } else if (!isNaN(Number(lookedUpEmployee?.division_unit)) && lookedUpEmployee?.division_unit) {
//         finalUnitId = Number(lookedUpEmployee.division_unit);
//       } else if (!isNaN(Number(selectedProducts[0]?.unit_id)) && selectedProducts[0]?.unit_id) {
//         finalUnitId = Number(selectedProducts[0].unit_id);
//       } else if (!isNaN(Number(user?.unit_id)) && user?.unit_id) {
//         finalUnitId = Number(user.unit_id);
//       }

//       const payload = {
//         code,
//         Order_code: code,
//         payment_mode: paymentMode,
//         item_ids,
//         total_amount: Number(total_amount),
//         // delivery_address: delivery_address || "Office Delivery",
//         emp_code: clerkCode || user?.emp_code || user?.username || "ADMIN",
//         unit_id: finalUnitId,
//         division_unit: lookedUpEmployee?.division_unit || matchedUnit?.name || selectedProducts[0]?.division_unit || user?.division_unit || "General",
//         // phone: addressDetails.phone || "0000000000",
//         // customer_phone: addressDetails.phone || "0000000000",
//         employeeCode: clerkCode || user?.emp_code || user?.username || "ADMIN01",
//         // deliveryAddress: delivery_address || "Office Delivery",
//         order_dates: selectedDates,
//         orderDate: selectedDates[0], // Fallback for single date compatibility
//         remarks: remarks || "",
//       };

//       console.log(
//         "Submitting order with payload:",
//         JSON.stringify(payload, null, 2)
//       );

//       const createRes = await api.post("/orders", payload);
//       const responseData = createRes.data;
//       console.log("Order created successfully - Full Response:", responseData);

//       const orderId =
//         responseData?.order_id ||
//         responseData?.order?.id ||
//         responseData?.data?.id ||
//         responseData?.id;
//       const finalOrder =
//         responseData?.order || responseData?.data || responseData;

//       if (!orderId) {
//         console.error(
//           "❌ Order ID extraction failed. Response Data:",
//           responseData
//         );
//         throw new Error("Failed to create order - ID missing in response");
//       }

//       console.log("Extracted Order ID:", orderId);
//       setAppOrderId(orderId);

//       if (paymentMode === "FREE" || paymentMode === "GUEST") {
//         try {
//           const payPayload = {
//             emp_code: clerkCode || user?.emp_code || user?.username || "ADMIN"
//           };

//           // Use the correct endpoint based on payment mode
//           const paymentEndpoint = paymentMode === "FREE"
//             ? `/orders/${orderId}/pay-free`
//             : `/orders/${orderId}/pay-guest`;

//           console.log(`Updating ${paymentMode} payment status:`, payPayload);
//           const paymentRes = await api.post(paymentEndpoint, payPayload);

//           console.log(`✅ ${paymentMode} Payment Response:`, paymentRes.data);

//           // Fetch QR code only (GET /orders/:id returns 404)
//           try {
//             // Skip: const orderRes = await api.get(`/orders/${orderId}`);
//             // console.log("📦 Complete Order Data:", orderRes.data);

//             // Fetch QR code
//             const qrRes = await api.get(`/orders/${orderId}/qr`);
//             console.log("🔲 QR Code Response:", qrRes.data);

//             // Extract data from responses
//             const orderDataFromResponse = paymentRes.data?.order || finalOrder;
//             const orderData = {
//               ...orderDataFromResponse,
//               id: orderId,
//               payment_status: "PAID",
//               dayBills: paymentRes.data?.order?.dayBills || paymentRes.data?.dayBills || finalOrder?.dayBills || []
//             };
//             const qrImage = qrRes.data?.qrImage || paymentRes.data?.qrImage;
//             const dayBillsData = orderData.dayBills;

//             console.log("📦 Using Order Data:", orderData);
//             console.log("📄 Day Bills:", dayBillsData);

//             // Set states for success modal
//             if (qrImage) {
//               setQrCode(qrImage);
//             }

//             if (dayBillsData.length > 0) {
//               setDayBills(dayBillsData);
//             }

//             setPaymentStatus("SUCCESS");
//             setPaymentDetails({
//               order: orderData,
//               dayBills: dayBillsData,
//               qrImage: qrImage,
//               paymentMode: paymentMode
//             });
//             setFullOrderData(orderData);

//             // Auto-print bills
//             if (dayBillsData.length > 0) {
//               setTimeout(() => {
//                 handlePrintBills({
//                   ...orderData,
//                   dayBills: dayBillsData
//                 });
//               }, 500);
//             }

//             console.log(`✅ ${paymentMode} order completed successfully!`);

//           } catch (fetchErr) {
//             console.error("Error fetching QR code:", fetchErr);
//             // Still show success modal even without QR
//             const orderData = {
//               ...(paymentRes.data?.order || finalOrder),
//               id: orderId,
//               payment_status: "PAID",
//               dayBills: paymentRes.data?.order?.dayBills || paymentRes.data?.dayBills || []
//             };

//             setPaymentStatus("SUCCESS");
//             setPaymentDetails({
//               order: orderData,
//               dayBills: orderData.dayBills || [],
//               paymentMode: paymentMode
//             });
//             setFullOrderData(orderData);

//             if (orderData.dayBills && orderData.dayBills.length > 0) {
//               setDayBills(orderData.dayBills);
//               setTimeout(() => {
//                 handlePrintBills({
//                   ...orderData,
//                   dayBills: orderData.dayBills
//                 });
//               }, 500);
//             }

//             console.log(`✅ ${paymentMode} order completed (QR unavailable)`);
//           }
//         } catch (payErr) {
//           console.error("Payment status update failed:", payErr.response?.data || payErr);
//           const errorMsg = payErr.response?.data?.message || payErr.response?.data?.error || "Unknown error";
//           alert(`Order created but failed to mark as paid: ${errorMsg}`);
//         }
//       } else if (paymentMode === "UPI") {
//         const totalAmountInPaise = Math.round(total_amount * 100);

//         const razorpayResponse = await api.post(
//           `/orders/${orderId}/create-razorpay-order`,
//           {
//             order_id: orderId,
//             amount: totalAmountInPaise,
//             order_code: code,
//           }
//         );

//         console.log(
//           "create-razorpay-order Response Data:",
//           razorpayResponse.data
//         );
//         const { razorpay_order_id, amount, key, key_id, razorpay_key } =
//           razorpayResponse.data;
//         const finalKey = key || key_id || razorpay_key;

//         if (!finalKey) {
//           throw new Error("Payment initialization failed: API Key missing");
//         }

//         const isLocalhost = window.location.hostname === 'localhost' ||
//           window.location.hostname === '127.0.0.1' ||
//           window.location.hostname.startsWith('192.168');

//         const options = {
//           key: finalKey,
//           amount,
//           currency: "INR",
//           name: "CMS",
//           image: "",
//           description: `Admin Order #${orderId} - ${code}`,
//           order_id: razorpay_order_id,
//           handler: async (response) => {
//             console.log("Razorpay payment successful. Response:", response);
//             try {
//               // Backend verification with QR code data
//               const verifyRes = await api.post(`/orders/${orderId}/verify-razorpay`, {
//                 razorpay_payment_id: response.razorpay_payment_id,
//                 razorpay_order_id: response.razorpay_order_id,
//                 razorpay_signature: response.razorpay_signature,
//                 emp_code: clerkCode || user?.username || "ADMIN",
//               });

//               console.log("✅ Admin Payment Verification Response:", verifyRes.data);
//               console.log("📦 Order Data:", verifyRes.data?.order);
//               console.log("📄 Day Bills:", verifyRes.data?.dayBills);
//               console.log("🔲 QR Image Available:", !!verifyRes.data?.qrImage);

//               // Extract complete payment response data
//               if (verifyRes.data?.qrImage) {
//                 setQrCode(verifyRes.data.qrImage);
//               }

//               // Store dayBills from response (backend returns nested in 'order')
//               const dayBillsData = verifyRes.data?.order?.dayBills || verifyRes.data?.dayBills || [];
//               if (dayBillsData.length > 0) {
//                 setDayBills(dayBillsData);
//               }

//               // Set payment status to success
//               setPaymentStatus("SUCCESS");
//               setPaymentDetails({
//                 ...verifyRes.data,
//                 order: verifyRes.data?.order || finalOrder,
//                 dayBills: dayBillsData
//               });
//               setFullOrderData(verifyRes.data?.order || finalOrder);

//               // Auto-print bills after successful payment
//               if (dayBillsData.length > 0) {
//                 setTimeout(() => {
//                   handlePrintBills({
//                     ...(verifyRes.data?.order || finalOrder),
//                     dayBills: dayBillsData
//                   });
//                 }, 500);
//               }

//               alert("Payment verified successfully!");
//               setSubmitting(false);
//             } catch (err) {
//               console.error(
//                 "❌ Payment verification failed:",
//                 err.response?.data || err
//               );
//               setPaymentStatus("FAILED");
//               alert(
//                 `Payment verification failed: ${err.response?.data?.error || err.message
//                 }`
//               );
//               setSubmitting(false);
//             }
//           },
//           prefill: {
//             contact: user?.phone || "9999999999",
//             email: user?.email || "admin@cms.com",
//             vpa: "success@razorpay",
//           },
//           display: {
//             blocks: {
//               upi: {
//                 name: "UPI",
//                 instruments: [{ method: "upi", types: ["qr"] }],
//               },
//               ...(isLocalhost ? {} : {
//                 googlepay: {
//                   name: "Google Pay",
//                   instruments: [{ method: "googlepay" }],
//                 },
//               }),
//               netbanking: {
//                 name: "Net Banking",
//                 instruments: [{ method: "netbanking" }],
//               },
//             },
//             sequence: isLocalhost
//               ? ["block.upi", "block.netbanking"]
//               : ["block.upi", "block.googlepay", "block.netbanking"],
//             preferences: {
//               show_default_blocks: true,
//             },
//           },
//           modal: {
//             ondismiss: async () => {
//               await cancelPendingOrder(orderId);
//               setSubmitting(false);
//             },
//           },
//           theme: { color: "#fac639" },
//         };

//         if (typeof window.Razorpay === "undefined") {
//           throw new Error("Razorpay script not loaded properly");
//         }

//         new window.Razorpay(options).open();
//       } else {
//         // Handle other payment modes like GUEST if needed
//         alert("Order created successfully!");
//         setSelectedProducts([]);
//       }
//     } catch (err) {
//       console.error("Order process Error:", err);
//       const errorResponse = err.response?.data;
//       let errorMsg =
//         err.message || "Invalid order data. Please check selection.";

//       if (typeof errorResponse === "string") {
//         errorMsg = errorResponse;
//       } else if (errorResponse?.error) {
//         errorMsg = errorResponse.error;
//       } else if (errorResponse?.message) {
//         errorMsg = errorResponse.message;
//       }

//       alert(`Error: ${errorMsg}`);
//     } finally {
//       // For UPI, the handler or ondismiss sets submitting false
//       // For FREE/GUEST, only set false if not showing success modal
//       if (paymentMode !== "UPI" && paymentStatus !== "SUCCESS") {
//         setSubmitting(false);
//       }
//     }
//   };
//   const handleSinglePrint = async (billId) => {
//     const orderId = fullOrderData?.id || fullOrderData?.order_id || appOrderId;
//     if (!orderId || !billId || printing) return;

//     // Show small loading state for this specific bill if we wanted, 
//     // but for now use the global printing state
//     setPrinting(true);

//     try {
//       console.log(`🖨️ Manual print trigger for Bill #${billId} (Order #${orderId})`);
//       const res = await api.post(`/orders/${orderId}/bills/${billId}/print`);
//       const jobId = res.data?.jobId;

//       // Update results if it exists in the list
//       setPrintResults(prev => prev.map(r =>
//         r.billId === billId ? { ...r, success: true, error: "", jobId } : r
//       ));

//       alert(`Print job #${jobId || ''} queued successfully`);
//     } catch (err) {
//       console.error("Manual print failed:", err);
//       const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
//       alert(`Print failed: ${errorMsg}`);

//       setPrintResults(prev => prev.map(r =>
//         r.billId === billId ? { ...r, success: false, error: errorMsg } : r
//       ));
//     } finally {
//       setPrinting(false);
//     }
//   };

//   const handlePrintBills = async (orderData) => {
//     const targetOrder = orderData || fullOrderData;
//     if (!targetOrder || printing) return;

//     setPrinting(true);
//     setPrintResults([]);
//     setPrintWarning(false);

//     try {
//       // Use dayBills from state or order data
//       const bills = dayBills.length > 0 ? dayBills : (targetOrder.dayBills || []);
//       const orderId = targetOrder.order_id || targetOrder.id || appOrderId;

//       if (bills.length === 0) {
//         console.warn("No dayBills found in order for auto-printing:", targetOrder);
//         setPrinting(false);
//         return;
//       }

//       console.log(`🖨️ Attempting to print ${bills.length} bills for order #${orderId}`);

//       const results = [];
//       for (const bill of bills) {
//         if (!bill || !bill.id) continue;

//         let success = false;
//         let errorMsg = "";
//         let jobId = null;

//         try {
//           // Standard print endpoint
//           const res = await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
//           success = true;
//           jobId = res.data?.jobId;
//         } catch (err) {
//           console.warn(`Admin print failed for ${bill.id}, trying V2...`);
//           try {
//             const res = await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
//             success = true;
//             jobId = res.data?.jobId;
//           } catch (v2Err) {
//             errorMsg = v2Err.response?.data?.error || v2Err.message;
//           }
//         }
//         results.push({ billId: bill.id, success, error: errorMsg, jobId });
//       }

//       setPrintResults(results);
//       if (results.some(r => !r.success)) setPrintWarning(true);
//     } catch (err) {
//       console.error("Admin print process failed:", err);
//     } finally {
//       setPrinting(false);
//     }
//   };

//   // Load Razorpay script
//   useEffect(() => {
//     if (window.Razorpay) {
//       setRazorpayLoaded(true);
//       return;
//     }

//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     script.onload = () => setRazorpayLoaded(true);
//     script.onerror = () =>
//       alert("Failed to load payment gateway. Refresh the page.");

//     document.head.appendChild(script);
//   }, []);

//   // Debug state changes
//   useEffect(() => {
//     console.log(`[AdminCheckout] Payment Status: ${paymentStatus}, Order ID: ${appOrderId}`);
//   }, [paymentStatus, appOrderId]);
//   useEffect(() => {
//     if (paymentStatus === "SUCCESS" && appOrderId && !qrUsed) {
//       const pollInterval = setInterval(() => {
//         fetchQRCode(appOrderId);
//       }, 4000);

//       return () => clearInterval(pollInterval);
//     }
//   }, [paymentStatus, appOrderId, qrUsed]);

//   // Auto-close success modal after 15 seconds with countdown
//   useEffect(() => {
//     if (paymentStatus === "SUCCESS") {
//       setCountdown(15); // Reset countdown

//       // Update countdown every second
//       const countInterval = setInterval(() => {
//         setCountdown((prev) => {
//           if (prev <= 1) {
//             clearInterval(countInterval);
//             return 0;
//           }
//           return prev - 1;
//         });
//       }, 1000);

//       // Close modal after 15 seconds
//       const closeTimer = setTimeout(() => {
//         console.log("⏱️ Auto-closing success modal after 15 seconds");
//         handleNewOrder(); // Reset to new order state
//       }, 15000);

//       return () => {
//         clearInterval(countInterval);
//         clearTimeout(closeTimer);
//       };
//     }
//   }, [paymentStatus]);

//   const cancelPendingOrder = async (orderId) => {
//     if (!orderId) return;
//     try {
//       await api.post(`/orders/${orderId}/cancel`);
//     } catch (err) {
//       console.error("Cancel order failed:", err);
//     }
//   };

//   const handleNewOrder = () => {
//     setSelectedProducts([]);
//     setPaymentStatus("IDLE");
//     setPaymentDetails(null);
//     setAppOrderId(null);
//     setPaymentMode("UPI");
//     setSubmitting(false);
//     setQrCode(null);
//     setQrUsed(false);
//     setDayBills([]);
//     setPrintResults([]);
//     setPrintWarning(false);
//     setFullOrderData(null);
//     setAddressDetails({
//       street: "",
//       city: "",
//       state: "",
//       pincode: "",
//       country: "India"
//     });
//     setClerkCode(""); // Manual entry: always reset to empty
//     setSelectedDates([new Date().toISOString().split('T')[0]]);
//     setRemarks("");
//   };

//   // =========================
//   // LOAD UNITS
//   // =========================
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const res = await api.get("/items/", { params: { limit: 1000 } });
//         setProducts(res.data?.items || res.data?.products || []);

//         const unitsRes = await api.get("/units");
//         let fetchedUnits = Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.units || [];

//         if (user?.role === 'unit_admin' && user?.unit_id) {
//           fetchedUnits = fetchedUnits.filter(u => u.id === user.unit_id);
//           setSelectedUnit(user.unit_id);
//         }

//         setUnits(fetchedUnits);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     loadData();
//   }, []);

//   // =========================
//   // LOAD PRODUCTS BY UNIT
//   // =========================
//   const loadProducts = useCallback(async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/items/", {
//         params: {
//           limit: 1000,
//           search: searchTerm
//         }
//       });

//       const productList = res.data?.items || res.data?.products ||
//         res.data?.data ||
//         (Array.isArray(res.data) ? res.data : []);

//       setProducts(productList);
//     } catch (err) {
//       console.error("❌ Error loading products:", err);
//     } finally {
//       setLoading(false);
//     }
//   }, [searchTerm]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       loadProducts();
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [loadProducts]);

//   // =========================
//   // FILTER PRODUCTS
//   // =========================
//   // =========================
//   // FILTER PRODUCTS
//   // =========================
//   const filteredProducts = useMemo(() => {
//     return products.filter(p => {
//       // 1. Activity Check
//       if (p.is_active === false || p.is_active === 0 || p.is_active === "0") return false;

//       // 2. Unit Filter
//       if (selectedUnit !== "ALL" && String(p.unit_id) !== String(selectedUnit)) return false;

//       // 3. Search Filter (Client-side fallback)
//       if (searchTerm) {
//         const search = searchTerm.toLowerCase();
//         const nameMatches = (p.name || "").toLowerCase().includes(search);
//         const nameEnMatches = (p.name_en || "").toLowerCase().includes(search);
//         if (!nameMatches && !nameEnMatches) return false;
//       }

//       return true;
//     });
//   }, [products, searchTerm, selectedUnit]);

//   // =========================
//   // MEMOIZED MODAL DATA
//   // =========================

//   // =========================
//   // HELPER FUNCTIONS
//   // =========================
//   const getProductTotalQty = (productId) => {
//     return selectedProducts
//       .filter((p) => p.id === productId)
//       .reduce((sum, p) => sum + (p.quantity || 0), 0);
//   };

//   const getProductVariantQty = (productId, variantId) => {
//     const found = selectedProducts.find(
//       (p) => p.id === productId && p.variant_id === variantId
//     );
//     return found ? found.quantity : 0;
//   };

//   const adjustProductQuantity = (product, delta, variantId) => {
//     setSelectedProducts((prev) => {
//       const existingIndex = prev.findIndex(
//         (p) => p.id === product.id && (variantId ? p.variant_id === variantId : true)
//       );

//       if (existingIndex === -1) {
//         if (delta > 0) {
//           return [
//             ...prev,
//             {
//               ...product,
//               quantity: delta,
//               variant_id: variantId,
//               selectedPrice: product.price || product.base_price
//             }
//           ];
//         }
//         return prev;
//       }

//       const updated = [...prev];
//       const nextQty = updated[existingIndex].quantity + delta;

//       if (nextQty <= 0) {
//         updated.splice(existingIndex, 1);
//       } else {
//         updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
//       }
//       return updated;
//     });
//   };

//   const calculateTotal = () =>
//     selectedProducts.reduce(
//       (sum, p) => sum + Number(p.selectedPrice || p.base_price || p.price || 0) * (p.quantity || 0),
//       0
//     );

//   const openProductPopup = (product) => {
//     const existing = selectedProducts.find(p => p.id === product.id);
//     setSelectedPopupProduct(product);
//     setPopupQuantity(existing ? existing.quantity : 1);
//     setIsPopupOpen(true);
//   };

//   const handlePopupAddToCart = () => {
//     if (!selectedPopupProduct) return;

//     const vId = selectedPopupProduct.variants?.[0]?.id || selectedPopupProduct.id;

//     setSelectedProducts((prev) => {
//       const existingIndex = prev.findIndex(
//         (p) => p.id === selectedPopupProduct.id && p.variant_id === vId
//       );

//       const updated = [...prev];
//       if (existingIndex !== -1) {
//         if (popupQuantity <= 0) {
//           updated.splice(existingIndex, 1);
//         } else {
//           updated[existingIndex] = { ...updated[existingIndex], quantity: popupQuantity };
//         }
//       } else if (popupQuantity > 0) {
//         updated.push({
//           ...selectedPopupProduct,
//           quantity: popupQuantity,
//           variant_id: vId,
//           selectedPrice: selectedPopupProduct.price || selectedPopupProduct.base_price
//         });
//       }
//       return updated;
//     });

//     setIsPopupOpen(false);
//     setSelectedPopupProduct(null);
//   };

//   // =========================
//   // SUBMIT ORDER
//   // =========================

//   if (loading && products.length === 0) {
//     return (
//       <AdminLayout>
//         <Loading />
//       </AdminLayout>
//     );
//   }
//   return (
//     <>
//       {/* Product Selection Popup */}
//       {isPopupOpen && selectedPopupProduct && (
//         <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
//           <div className="bg-[var(--surface-card)] w-full max-w-md rounded-[2rem] shadow-2xl border border-[var(--border-default)] overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
//             <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
//               <div className="flex justify-between items-center mb-6">
//                 <h3 className="text-xl font-bold text-[var(--text-primary)]">Item selection</h3>
//                 <button
//                   onClick={() => setIsPopupOpen(false)}
//                   className="p-2 hover:bg-[var(--surface-muted)] rounded-full transition-colors"
//                 >
//                   <FiXCircle size={24} className="text-[var(--text-secondary)]" />
//                 </button>
//               </div>

//               <div className="flex flex-col items-center mb-8">
//                 <div className="w-32 h-32 rounded-2xl bg-[var(--surface-muted)] overflow-hidden mb-4 border border-[var(--border-default)]">
//                   <img
//                     src={(() => {
//                       const imgUrl = selectedPopupProduct.images?.[0]?.url || selectedPopupProduct.image || selectedPopupProduct.image_path;
//                       if (!imgUrl) return noImage;
//                       return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
//                         ? imgUrl
//                         : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
//                     })()}
//                     className="w-full h-full object-contain p-2"
//                     onError={(e) => (e.target.src = noImage)}
//                   />
//                 </div>
//                 <h4 className="text-lg font-bold text-[var(--text-primary)] text-center capitalize mb-1">
//                   {selectedPopupProduct.name_en || selectedPopupProduct.name}
//                 </h4>
//                 <p className="text-[var(--brand-primary)] font-black text-xl">
//                   ₹{parseFloat(selectedPopupProduct.price || selectedPopupProduct.base_price || 0).toFixed(2)}
//                 </p>
//               </div>

//               <div className="bg-[var(--surface-muted)]/30 rounded-2xl p-6 mb-8 border border-[var(--border-default)]">
//                 <p className="text-center text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
//                   Select Quantity
//                 </p>
//                 <div className="flex items-center justify-center gap-8">
//                   <button
//                     onClick={() => setPopupQuantity(Math.max(0, popupQuantity - 1))}
//                     className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all active:scale-90"
//                   >
//                     <FaMinus size={14} />
//                   </button>
//                   <span className="text-4xl font-black text-[var(--text-primary)] w-12 text-center">
//                     {popupQuantity}
//                   </span>
//                   <button
//                     onClick={() => setPopupQuantity(popupQuantity + 1)}
//                     className="w-12 h-12 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20 hover:scale-110 transition-all active:scale-90"
//                   >
//                     <FaPlus size={14} />
//                   </button>
//                 </div>
//               </div>

//               <button
//                 onClick={handlePopupAddToCart}
//                 className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
//               >
//                 {popupQuantity === 0 ? "Remove Order" : "order Now"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {paymentStatus === "SUCCESS" && (
//         /* High-Visibility Full-Page Success Overlay */
//         <div className="fixed inset-0 z-[99999] bg-[var(--surface-main)] flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
//           <div className="w-full sm:max-w-4xl bg-[var(--surface-card)] sm:rounded-[2.5rem] shadow-none sm:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-0 sm:border border-[var(--border-default)] overflow-hidden animate-in zoom-in duration-500 min-h-screen sm:min-h-0">
//             <div className="flex flex-col md:flex-row h-full">

//               {/* Left Side: Success Animation & Summary */}
//               <div className="flex-1 p-6 sm:p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[var(--border-default)] bg-gradient-to-b from-emerald-500/5 to-transparent">
//                 <img src={successGif} alt="Success" className="h-32 sm:h-56 mx-auto mb-6 sm:mb-8 drop-shadow-2xl" />
//                 <h1 className="text-2xl sm:text-4xl font-black text-emerald-600 mb-2 sm:mb-4 tracking-tight">Payment Successful!</h1>
//                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest mb-8">
//                   <FiCheckCircle /> Transaction Verified
//                 </div>

//                 <div className="w-full space-y-3 bg-[var(--surface-muted)]/30 p-6 rounded-2xl border border-[var(--border-default)]">
//                   <div className="flex justify-between items-center text-sm">
//                     <span className="opacity-60 font-medium">Order Reference:</span>
//                     <span className="font-bold text-emerald-600 uppercase">#{appOrderId}</span>
//                   </div>

//                   {/* Day Bills Information */}
//                   {dayBills && dayBills.length > 0 && (
//                     <div className="border-t border-[var(--border-default)] pt-3 space-y-2">
//                       <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Bills Generated ({dayBills.length} days)</p>
//                       {dayBills.map((bill, idx) => (
//                         <div key={bill.id || idx} className="flex justify-between items-center text-xs bg-[var(--surface-card)] p-2 rounded-lg">
//                           <div>
//                             <span className="font-bold opacity-80">Bill #{bill.id}</span>
//                             <span className="text-[10px] opacity-60 ml-2">{bill.bill_date}</span>
//                           </div>
//                           <span className="font-bold">₹{parseFloat(bill.amount || 0).toFixed(2)}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--border-default)]">
//                     <span className="opacity-60 font-medium">Total Amount:</span>
//                     <span className="text-2xl font-black text-[var(--text-primary)]">₹{calculateTotal().toFixed(2)}</span>
//                   </div>
//                 </div>

//                 {/* Print Status Report */}
//                 <div className="w-full mt-6">
//                   <div className="p-5 rounded-2xl border border-[var(--border-default)] text-left bg-white dark:bg-black/10">
//                     <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 pl-1 flex items-center gap-2">
//                       <FiPrinter size={12} /> Print Status Report
//                     </p>
//                     {printing ? (
//                       <div className="flex items-center gap-3 py-2">
//                         <FiRefreshCw className="animate-spin text-amber-500" />
//                         <span className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Printer working...</span>
//                       </div>
//                     ) : printResults.length > 0 ? (
//                       <div className="space-y-3">
//                         {printResults.map((result, index) => (
//                           <div key={index} className="flex items-center justify-between text-xs sm:text-sm bg-black/5 p-2 rounded-lg border border-white/5">
//                             <div className="flex items-center gap-2">
//                               <FiPrinter className={result.success ? "text-emerald-500" : "text-rose-400"} />
//                               <div className="flex flex-col">
//                                 <span className="font-medium opacity-80 uppercase tracking-tight text-[10px]">Bill #{result.billId || 'N/A'}</span>
//                                 <span className={`text-[8px] font-bold ${result.success ? 'text-emerald-500' : 'text-rose-500'}`}>
//                                   {result.success ? `SUCCESSFULLY SENT (JOB #${result.jobId || '??'})` : 'FAILED TO PRINT'}
//                                 </span>
//                               </div>
//                             </div>
//                             <button
//                               onClick={() => handleSinglePrint(result.billId)}
//                               disabled={printing}
//                               className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${result.success
//                                 ? "bg-slate-200 text-slate-600 hover:bg-[var(--brand-primary)] hover:text-white"
//                                 : "bg-rose-500 text-white hover:bg-rose-600"
//                                 } disabled:opacity-50`}
//                             >
//                               {printing ? "..." : (result.success ? "REPRINT" : "RETRY")}
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <p className="text-[10px] font-bold text-slate-400 italic">Auto-print process pending...</p>
//                     )}
//                   </div>

//                   {printWarning && (
//                     <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center gap-2 animate-bounce">
//                       <FiXCircle />
//                       <span className="text-[10px] font-black uppercase">Printing issues detected!</span>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Right Side: Order Detail & QR */}
//               <div id="printable-bill" className="flex-1 p-8 sm:p-12 flex flex-col bg-[var(--surface-card)]">
//                 <div className="mb-8">
//                   <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 flex items-center gap-2">
//                     <FiShoppingCart /> Items Breakdown
//                   </h2>
//                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
//                     {selectedProducts.map((p, i) => (
//                       <div key={i} className="flex justify-between items-center border-b border-[var(--border-default)]/50 pb-3">
//                         <div className="text-left">
//                           <p className="font-bold text-sm text-[var(--text-primary)]">{p.name}</p>
//                         </div>
//                         <div className="text-right">
//                           <p className="font-black text-sm">₹{((p.selectedPrice || p.price || 0) * (p.quantity || 1)).toFixed(2)}</p>
//                           <p className="text-[10px] font-bold opacity-30">{p.quantity} x ₹{p.selectedPrice || p.price}</p>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Persistent QR Section */}
//                 <div className="mt-auto flex flex-col items-center p-6 bg-[var(--surface-muted)]/20 rounded-3xl border border-[var(--border-default)] relative group">
//                   <div className="absolute inset-0 bg-[var(--brand-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>

//                   {fetchingQR && !qrCode ? (
//                     <div className="w-32 h-32 flex flex-col items-center justify-center animate-pulse gap-2">
//                       <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" />
//                       <p className="text-[8px] font-black opacity-40 uppercase">Checking QR...</p>
//                     </div>
//                   ) : qrUsed ? (
//                     <div className="w-32 h-32 flex flex-col items-center justify-center text-rose-500 text-center">
//                       <FiCheckCircle size={32} className="mb-2" />
//                       <p className="text-[10px] font-black uppercase">QR USED</p>
//                     </div>
//                   ) : qrCode ? (
//                     <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-lg">
//                       <img src={qrCode} alt="QR" className="w-32 h-32 object-contain" />
//                     </div>
//                   ) : (
//                     <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
//                       <p className="text-[8px] opacity-40 font-bold uppercase">QR Unavailable</p>
//                     </div>
//                   )}
//                   <p className="mt-4 text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest">Show for verification</p>
//                 </div>

//                 <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
//                   <button
//                     onClick={handleNewOrder}
//                     className="flex items-center justify-center gap-2 px-6 py-4 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all sm:col-span-2"
//                   >
//                     <FiPlusCircle /> NEW ORDER ({countdown}s)
//                   </button>
//                   <button
//                     onClick={() => handlePrintBills()}
//                     disabled={printing}
//                     className="flex items-center justify-center gap-2 px-6 py-4 bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-2xl font-black text-xs border border-[var(--border-default)] hover:bg-[var(--surface-card)] transition-all disabled:opacity-50"
//                   >
//                     <FiPrinter /> {printing ? "PRINTING..." : "THERMAL"}
//                   </button>
//                   <button
//                     onClick={() => window.print()}
//                     className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-500/10 text-blue-500 rounded-2xl font-black text-xs border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
//                   >
//                     <FiPrinter /> SYSTEM
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       <AdminLayout>
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8 animate-slide-up opacity-0">
//             <div className="flex items-center gap-3">
//               <div className="w-1.5 h-8 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
//               <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
//                 {"Orders".split("").map((char, i) => (
//                   <span
//                     key={i}
//                     className="animate-letter-pop"
//                     style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
//                   >
//                     {char === " " ? "\u00A0" : char}
//                   </span>
//                 ))}
//               </h1>
//             </div>

//             <button
//               onClick={() => setShowScanner(true)}
//               className="flex items-center gap-2 px-6 py-3 bg-[var(--surface-card)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-2xl font-bold text-sm shadow-sm border border-[var(--border-default)] transition-all hover:scale-105 active:scale-95"
//             >
//               <FiCamera size={18} className="text-[var(--brand-primary)]" />
//               <span>SCAN QR</span>
//             </button>
//           </div>

//           <div className="flex flex-col lg:flex-row gap-8">
//             <div className="flex-1 space-y-8 min-w-0">

//               {/* Products Selection Card */}
//               <div className="p-4 sm:p-6 rounded-2xl border bg-[var(--surface-card)] border-[var(--border-default)] shadow-lg overflow-hidden">
//                 {/* Header with Unit Filter */}
//                 <div className="mb-6 border-b border-[var(--border-default)] pb-6">
//                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
//                     <div className="text-[var(--brand-primary)] font-bold whitespace-nowrap hidden sm:block text-lg">
//                       ALL ITEMS
//                     </div>

//                     <div className="w-full sm:w-64">
//                       <div className="relative">
//                         <select
//                           value={selectedUnit}
//                           onChange={(e) => setSelectedUnit(e.target.value)}
//                           disabled={user?.role === 'unit_admin'}
//                           className="w-full appearance-none bg-[#0f172a] text-white border border-gray-600 rounded-lg py-3 px-4 pr-10 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-colors cursor-pointer text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                           <option value="ALL">All Units</option>
//                           {units.map((unit) => (
//                             <option key={unit.id} value={unit.id}>
//                               {unit.name} - {unit.code}
//                             </option>
//                           ))}
//                         </select>
//                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/50">
//                           <FiChevronDown size={18} />
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div
//                   style={{ animationDelay: '100ms' }}
//                   className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-up opacity-0"
//                 >
//                   {/* <h2 className="text-xl font-medium text-[var(--text-primary)] uppercase tracking-tight">
//                     {"All Items".split("").map((char, i) => (
//                       <span
//                         key={i}
//                         className="animate-letter-pop"
//                         style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
//                       >
//                         {char === " " ? "\u00A0" : char}
//                       </span>
//                     ))}
//                   </h2> */}

//                   <div className="relative w-full sm:w-64 group">
//                     <input
//                       type="text"
//                       placeholder="Search items..."
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       className="w-full px-12 py-3 text-sm text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-secondary)]/50"
//                     />
//                     <FiSearch
//                       className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors"
//                       size={18}
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 max-h-[60vh] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
//                   {Array.isArray(filteredProducts) &&
//                     filteredProducts.map((product) => {
//                       const totalQty = getProductTotalQty(product.id);
//                       return (
//                         <div
//                           key={product.id}
//                           className={`group p-3 rounded-2xl border-2 transition-all relative overflow-hidden flex flex-col ${totalQty > 0
//                             ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
//                             : "border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 bg-[var(--surface-main)]"
//                             }`}
//                         >
//                           <div
//                             onClick={() => openProductPopup(product)}
//                             className="cursor-pointer"
//                           >
//                             <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-[var(--surface-muted)]">
//                               <img
//                                 src={(() => {
//                                   const imgUrl = product.images?.[0]?.url || product.image || product.image_path;
//                                   if (!imgUrl) return noImage;
//                                   return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
//                                     ? imgUrl
//                                     : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
//                                 })()}
//                                 className="w-full h-full object-contain transition-transform group-hover:scale-110 p-1"
//                                 onError={(e) => (e.target.src = noImage)}
//                               />
//                             </div>
//                             <div className="text-left mb-3">
//                               <div className="font-medium text-sm truncate text-[var(--text-primary)] capitalize">
//                                 {product.name_en || product.name}
//                               </div>
//                               <div className="text-xs font-semibold text-[var(--brand-primary)] mt-1">
//                                 ₹{parseFloat(product.price || product.base_price || 0).toFixed(2)}
//                               </div>
//                             </div>
//                           </div>

//                           <div className="mt-auto flex items-center justify-between gap-2">
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 adjustProductQuantity(product, -1, product.variants?.[0]?.id || product.id);
//                               }}
//                               className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] transition-all active:scale-95 hover:bg-rose-500 hover:text-white"
//                             >
//                               <FaMinus className="text-base sm:text-lg" />
//                             </button>

//                             <span className={`text-xl font-black min-w-[24px] text-center ${totalQty > 0 ? "text-[var(--brand-primary)]" : "text-[var(--text-secondary)] opacity-50"}`}>
//                               {totalQty}
//                             </span>

//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 adjustProductQuantity(product, 1, product.variants?.[0]?.id || product.id);
//                               }}
//                               className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white transition-all active:scale-95 shadow-lg shadow-[var(--brand-primary)]/20"
//                             >
//                               <FaPlus className="text-base sm:text-lg" />
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}
//                 </div>
//               </div>
//             </div>

//             {/* Cart & Payment Summary Sidebar */}
//             <div ref={summaryRef} className="w-full lg:w-[380px] space-y-6 lg:sticky lg:top-8 h-fit">
//               <div className="p-4 sm:p-6 rounded-2xl border bg-[var(--surface-card)] border-[var(--border-default)] shadow-xl relative">
//                 {/* Accent decoration */}
//                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

//                 <h2 className="text-xl font-medium mb-8 text-[var(--text-primary)] flex justify-between items-center px-1">
//                   Order Summary
//                 </h2>

//                 <div className="mb-8 space-y-4">
//                   <div className="flex justify-between items-center px-1">
//                     <label className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider flex items-center gap-2">
//                       Employee Code
//                     </label>
//                   </div>
//                   <div className="relative group">
//                     <input
//                       type="text"
//                       value={clerkCode}
//                       onChange={(e) => setClerkCode(e.target.value)}
//                       placeholder="Enter employee code..."
//                       className="w-full px-12 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] text-sm font-medium transition-all shadow-inner text-center placeholder:text-[var(--text-secondary)]/50"
//                     />
//                     <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors" size={18} />
//                     {lookingUpEmp && (
//                       <FiRefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-primary)] animate-spin" size={16} />
//                     )}
//                   </div>
//                   {addressDetails.street && !lookingUpEmp && (
//                     <div className="mx-1 p-3 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 animate-in fade-in slide-in-from-top-1 duration-300">
//                       <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest mb-1">Detected Location</p>
//                       <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
//                         {addressDetails.street}
//                         {addressDetails.city && `, ${addressDetails.city}`}
//                       </p>
//                       {addressDetails.phone && (
//                         <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-bold">
//                           Contact: {addressDetails.phone}
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 <div className="mb-6 space-y-3">
//                   <div className="flex justify-between items-center px-1">
//                     <label className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider flex items-center gap-2">
//                       Dates
//                     </label>
//                   </div>

//                   <div className="bg-[var(--surface-main)] rounded-2xl p-4 border border-[var(--border-default)] shadow-sm transition-colors duration-200">
//                     {/* Calendar Header */}
//                     <div className="flex justify-between items-center mb-4">
//                       <button
//                         onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))}
//                         className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
//                       >
//                         <FiChevronLeft className="text-lg" />
//                       </button>

//                       <div className="flex flex-col items-center">
//                         <span className="text-sm font-bold text-[var(--text-primary)]">
//                           {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
//                         </span>
//                       </div>

//                       <button
//                         onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))}
//                         className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
//                       >
//                         <FiChevronRight className="text-lg" />
//                       </button>
//                     </div>

//                     {/* Select All Checkbox */}
//                     <div className="flex justify-center mb-4">
//                       <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--brand-primary)]">
//                         <input
//                           type="checkbox"
//                           className="rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
//                           checked={(() => {
//                             // Check if all selectable days in current view month are selected
//                             const year = calendarViewDate.getFullYear();
//                             const month = calendarViewDate.getMonth();
//                             const daysInMonth = new Date(year, month + 1, 0).getDate();
//                             let selectableDaysCount = 0;
//                             let selectedSelectableCount = 0;

//                             for (let i = 1; i <= daysInMonth; i++) {
//                               const date = new Date(year, month, i);
//                               if (!isDateDisabled(date)) {
//                                 selectableDaysCount++;
//                                 const d = toLocalDateString(date);
//                                 if (selectedDates.includes(d)) {
//                                   selectedSelectableCount++;
//                                 }
//                               }
//                             }
//                             return selectableDaysCount > 0 && selectableDaysCount === selectedSelectableCount;
//                           })()}
//                           onChange={(e) => {
//                             const year = calendarViewDate.getFullYear();
//                             const month = calendarViewDate.getMonth();
//                             const daysInMonth = new Date(year, month + 1, 0).getDate();

//                             if (e.target.checked) {
//                               // Select all SELECTABLE days
//                               const newSelection = new Set(selectedDates);
//                               for (let i = 1; i <= daysInMonth; i++) {
//                                 const date = new Date(year, month, i);
//                                 if (!isDateDisabled(date)) {
//                                   newSelection.add(toLocalDateString(date));
//                                 }
//                               }
//                               setSelectedDates(Array.from(newSelection));
//                             } else {
//                               // Deselect all for current month
//                               const toRemove = [];
//                               for (let i = 1; i <= daysInMonth; i++) {
//                                 toRemove.push(toLocalDateString(new Date(year, month, i)));
//                               }
//                               setSelectedDates(selectedDates.filter(d => !toRemove.includes(d)));
//                             }
//                           }}
//                         />
//                         <span>Select all</span>
//                       </label>
//                     </div>

//                     {/* Weekday Headers */}
//                     <div className="grid grid-cols-7 mb-2">
//                       {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
//                         <div key={day} className="text-center text-[11px] font-semibold text-[var(--text-secondary)] py-1">
//                           {day}
//                         </div>
//                       ))}
//                     </div>

//                     {/* Calendar Grid */}
//                     <div className="grid grid-cols-7 gap-1">
//                       {(() => {
//                         const year = calendarViewDate.getFullYear();
//                         const month = calendarViewDate.getMonth();
//                         const firstDay = new Date(year, month, 1).getDay();
//                         const daysInMonth = new Date(year, month + 1, 0).getDate();
//                         const days = [];

//                         // Empty slots
//                         for (let i = 0; i < firstDay; i++) {
//                           days.push(<div key={`empty-${i}`} className="h-10 sm:h-8" />);
//                         }

//                         // Days
//                         for (let i = 1; i <= daysInMonth; i++) {
//                           const currentDate = new Date(year, month, i);
//                           const dateString = toLocalDateString(currentDate);
//                           const isDisabled = isDateDisabled(currentDate);
//                           const isSelected = selectedDates.includes(dateString);
//                           const isToday = dateString === toLocalDateString(new Date());

//                           days.push(
//                             <button
//                               key={i}
//                               disabled={isDisabled}
//                               onClick={() => {
//                                 if (isDisabled) return;
//                                 if (isSelected) {
//                                   setSelectedDates(selectedDates.filter(d => d !== dateString));
//                                 } else {
//                                   setSelectedDates([...selectedDates, dateString]);
//                                 }
//                               }}
//                               className={`h-10 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${isSelected
//                                 ? 'bg-[var(--brand-primary)] text-white shadow-md'
//                                 : isToday && !isDisabled
//                                   ? 'text-[var(--brand-primary)] font-bold bg-[var(--brand-primary)]/10'
//                                   : isDisabled
//                                     ? 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed bg-[var(--surface-muted)]/50'
//                                     : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
//                                 }`}
//                             >
//                               {i}
//                             </button>
//                           );
//                         }
//                         return days;
//                       })()}
//                     </div>

//                     <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-muted)]/10 -mx-4 px-4 py-2 sm:mx-0 sm:rounded-xl">
//                       <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total days</span>
//                       <span className="text-lg font-black text-[var(--brand-primary)]">{selectedDates.length}</span>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="space-y-4 mb-8 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
//                   {selectedProducts.length === 0 ? (
//                     <p className="text-center text-[var(--text-secondary)] text-sm py-4">No products selected</p>
//                   ) : (
//                     selectedProducts.map((p, idx) => (
//                       <div key={`${p.id}-${idx}`} className="flex justify-between items-start text-sm p-3 rounded-2xl bg-[var(--surface-main)] border border-transparent hover:border-[var(--brand-primary)]/20 transition-all">
//                         <div className="flex-1 min-w-0">
//                           <p className="font-bold truncate text-[var(--text-primary)] capitalize mb-1">{p.name_en || p.name}</p>
//                           <div className="flex items-center gap-2">
//                             <span className="text-[9px] font-black bg-[var(--brand-primary)] text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
//                               QTY {p.quantity}
//                             </span>
//                           </div>
//                         </div>
//                         <div className="text-right ml-4">
//                           <p className="font-black text-[var(--text-primary)]">₹{(Number(p.selectedPrice || p.base_price || p.price || 0) * p.quantity).toFixed(2)}</p>
//                           <p className="text-[10px] text-[var(--text-secondary)]">₹{Number(p.selectedPrice || p.base_price || p.price || 0).toFixed(2)} / ea</p>
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//                 <div className="space-y-2 border-t border-[var(--border-default)] pt-4 mb-6">
//                   <div className="flex justify-between items-center text-[var(--text-secondary)]">
//                     <span className="text-[10px] font-black uppercase tracking-widest">Total Items</span>
//                     <span className="font-black text-sm">{selectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}</span>
//                   </div>
//                   <div className="flex justify-between items-end">
//                     <span className="text-xs font-medium text-[var(--text-secondary)] tracking-widest uppercase">
//                       Grand Total
//                     </span>
//                     <span className="text-2xl sm:text-3xl font-semibold text-[var(--brand-primary)]">
//                       ₹{calculateTotal().toFixed(2)}
//                     </span>
//                   </div>
//                 </div>

//                 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
//                   Payment Mode
//                 </label>

//                 <div className="grid grid-cols-3 gap-3 mb-3">
//                   <button
//                     onClick={() => setPaymentMode("UPI")}
//                     className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "UPI"
//                       ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
//                       : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
//                       }`}
//                   >
//                     UPI
//                   </button>
//                   <button
//                     onClick={() => setPaymentMode("FREE")}
//                     className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "FREE"
//                       ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
//                       : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
//                       }`}
//                   >
//                     FREE MEALS
//                   </button>
//                   <button
//                     onClick={() => setPaymentMode("GUEST")}
//                     className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "GUEST"
//                       ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
//                       : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
//                       }`}
//                   >
//                     GUEST
//                   </button>
//                 </div>

//                 {(paymentMode === "FREE" || paymentMode === "GUEST") && (
//                   <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
//                     <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
//                       Reference  <span className="text-rose-500">*</span>
//                     </label>
//                     <textarea
//                       value={remarks}
//                       onChange={(e) => setRemarks(e.target.value)}
//                       placeholder={`Enter ${paymentMode === 'FREE' ? 'Free Meal' : 'Guest'} details...`}
//                       className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] min-h-[80px] text-sm font-medium resize-none transition-all placeholder:text-[var(--text-secondary)]/50"
//                     />
//                   </div>
//                 )}
//               </div>

//               {/* Delivery Address Section */}

//               {/* PAYMENT STATUS & CONTROLS */}
//               <div className="mt-6">
//                 {paymentStatus !== "SUCCESS" && (
//                   <>
//                     {paymentStatus === "FAILED" && (
//                       <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-4 text-sm text-red-600 flex items-center justify-center gap-2">
//                         <FaTimes /> Payment Failed or Cancelled. Please try again.
//                       </div>
//                     )}

//                     <button
//                       onClick={handleSubmit}
//                       disabled={submitting || selectedProducts.length === 0 || selectedDates.length === 0}
//                       className={`w-full py-4 rounded-xl text-lg font-semibold tracking-tight transition-all active:scale-95 shadow-xl ${submitting || selectedProducts.length === 0 || selectedDates.length === 0
//                         ? "opacity-50 cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-secondary)]"
//                         : "bg-gradient-to-br from-[var(--brand-primary)] to-[#ea580c] text-white border border-transparent hover:from-white hover:to-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:translate-y-[-2px] hover:shadow-[var(--brand-primary)]/20"
//                         }`}
//                     >
//                       {submitting
//                         ? "Processing..."
//                         : paymentStatus === "FAILED" ? "Retry Payment" : "Create & Print Bill"
//                       }
//                     </button>
//                   </>
//                 )}
//               </div>

//               <p className="text-[10px] text-center mt-4 text-[var(--text-secondary)] font-medium">
//                 {paymentStatus === "SUCCESS"
//                   ? "Order marked as PAID in admin records."
//                   : "Admin order will be automatically logged and printed."}
//               </p>
//             </div>
//           </div>
//         </div>

//       </AdminLayout >

//       {/* Mobile Floating Bottom Bar */}
//       {showMobileTotal && (
//         <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
//           <div className="max-w-md mx-auto pointer-events-auto">
//             <div
//               onClick={scrollToSummary}
//               className="bg-[var(--brand-primary)] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all animate-slide-up"
//             >
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
//                   <FiShoppingCart className="text-xl" />
//                 </div>
//                 <div>
//                   <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Total</p>
//                   <p className="text-xl font-black">₹{calculateTotal().toFixed(2)}</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2 font-black uppercase tracking-widest text-xs">
//                 Review Order
//                 <FiChevronRight />
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//       {/* QR Scanner Modal */}
//       {showScanner && (
//         <QRScanner
//           onScan={handleQRScan}
//           onClose={() => setShowScanner(false)}
//           onError={(err) => console.warn(err)}
//         />
//       )}

//       {/* Verification Result Modal */}
//       {(scanResult || scanError) && (
//         <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeScanResult}>
//           <div className="bg-[var(--surface-card)] w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl animate-in zoom-in duration-300 relative border border-[var(--border-default)]" onClick={e => e.stopPropagation()}>
//             <button onClick={closeScanResult} className="absolute top-4 right-4 p-2 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-main)]">
//               <FiX size={20} />
//             </button>

//             {scanResult ? (
//               <div className="flex flex-col items-center gap-4">
//                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
//                   <FiPackage size={40} />
//                 </div>
//                 <div>
//                   <h3 className="text-2xl font-black text-emerald-500 mb-1">VERIFIED!</h3>
//                   <p className="text-[var(--text-secondary)] font-medium text-sm">Order has been successfully verified.</p>
//                 </div>

//                 <div className="w-full bg-[var(--surface-muted)] rounded-2xl p-4 text-left border border-[var(--border-default)] mt-2">
//                   <div className="flex justify-between items-center mb-2">
//                     <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Order ID</span>
//                     <span className="font-mono font-bold text-[var(--text-primary)]">#{scanResult.order?.code || scanResult.order?.id}</span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Customer</span>
//                     <span className="font-bold text-[var(--text-primary)] text-sm">{scanResult.order?.customer_name || scanResult.order?.customer?.username || 'Guest'}</span>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex flex-col items-center gap-4">
//                 <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
//                   <FiX size={40} />
//                 </div>
//                 <div>
//                   <h3 className="text-2xl font-black text-red-500 mb-1">FAILED</h3>
//                   <p className="text-[var(--text-secondary)] font-medium text-sm">Verification failed.</p>
//                 </div>
//                 <p className="text-xs font-mono bg-red-500/5 text-red-600 p-3 rounded-xl w-full break-all border border-red-500/10">
//                   {scanError}
//                 </p>
//               </div>
//             )}

//             <button
//               onClick={closeScanResult}
//               className="w-full mt-6 py-4 rounded-xl bg-[var(--brand-primary)] text-[var(--text-inverse)] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
//             >
//               {scanResult ? 'Done' : 'Try Again'}
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default AdminCheckout;
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout.jsx";
import Loading from "../../components/Loading.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import api, { API_BASE_URL } from "../../config/api.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import successGif from "../../assets/success.gif";
import noImage from "../../assets/No_image.png";
import QRScanner from "../../components/QRScanner";
import { FiMenu, FiUser, FiLogOut, FiSearch, FiCheckCircle, FiPrinter, FiHome, FiRefreshCw, FiShoppingCart, FiPlusCircle, FiXCircle, FiChevronDown, FiChevronLeft, FiChevronRight, FiCamera, FiX, FiPackage } from "react-icons/fi";

// ... [existing imports] ...


import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";

const AdminCheckout = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const handleQRScan = async (decodedText) => {
    setShowScanner(false);
    setScanError(null);
    setScanResult(null);

    try {
      // Extract Token
      let qrToken = decodedText;
      if (decodedText.includes('/qr-verify/')) {
        qrToken = decodedText.split('/qr-verify/').pop();
      }

      // Verify with Backend
      const res = await api.post(`/orders/scan-qr`, { token: qrToken });

      if (res.data.success) {
        setScanResult(res.data);
      } else {
        setScanError("Verification returned unsuccessful status");
      }
    } catch (err) {
      console.error("QR Verification Error:", err);

      // Try v2 fallback
      try {
        let qrToken = decodedText;
        if (decodedText.includes('/qr-verify/')) qrToken = decodedText.split('/qr-verify/').pop();
        const resV2 = await api.post(`/v2/orders/scan-qr`, { token: qrToken });
        if (resV2.data.success) {
          setScanResult(resV2.data);
          return;
        }
      } catch (e) { /* Ignore */ }

      const errorMsg = err.response?.data?.message || err.message || 'Verification Failed';
      setScanError(errorMsg);

      if (err.response?.data?.used_at) {
        setScanError(`ALREADY VERIFIED at ${new Date(err.response.data.used_at).toLocaleString()}`);
      }
    }
  };

  const closeScanResult = () => {
    setScanResult(null);
    setScanError(null);
  };
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [appOrderId, setAppOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedPopupProduct, setSelectedPopupProduct] = useState(null);
  const [popupQuantity, setPopupQuantity] = useState(1);

  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("ALL");

  const [paymentStatus, setPaymentStatus] = useState("IDLE");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [fetchingQR, setFetchingQR] = useState(false);
  const [qrUsed, setQrUsed] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printResults, setPrintResults] = useState([]);
  const [printWarning, setPrintWarning] = useState(false);
  const [fullOrderData, setFullOrderData] = useState(null);
  const [dayBills, setDayBills] = useState([]);
  const [countdown, setCountdown] = useState(3); // Auto-close countdown
  const summaryRef = useRef(null);
  const [addressDetails, setAddressDetails] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: ""
  });
  /* Manual Entry Enforced: Default to empty string instead of user code */
  const [clerkCode, setClerkCode] = useState("");
  const [lookedUpEmployee, setLookedUpEmployee] = useState(null);
  const [fetchingAddress, setFetchingAddress] = useState(false);
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

  const [selectedDates, setSelectedDates] = useState(() => {
    const today = new Date();
    if (isDateDisabled(today)) return [];
    return [toLocalDateString(today)];
  });
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [remarks, setRemarks] = useState("");

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

  // Removed separate state for lookup
  const [lookingUpEmp, setLookingUpEmp] = useState(false);

  // Auto-fill address when clerkCode changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clerkCode && clerkCode.length >= 1) { // Changed from 3 to 1 to allow short codes
        handleEmployeeLookup(clerkCode);
      } else if (!clerkCode) {
        // Clear address if code is cleared
        setAddressDetails({
          street: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
          phone: ""
        });
      }
    }, 1000); // Keep debounce to avoid spamming while typing
    return () => clearTimeout(timer);
  }, [clerkCode]);



  const handleEmployeeLookup = async (codeToSearch) => {
    if (!codeToSearch) return;
    setLookingUpEmp(true);
    try {
      const res = await api.get(`/employees/?search=${codeToSearch}&limit=1000`);
      let employees = [];
      if (res.data && Array.isArray(res.data.employees)) {
        employees = res.data.employees;
      } else if (res.data && Array.isArray(res.data)) {
        employees = res.data;
      } else if (res.data && res.data.data) {
        employees = res.data.data;
      }

      // Find exact or close match
      const emp = employees.find(e =>
        (e.emp_code && e.emp_code.toLowerCase() === codeToSearch.toLowerCase()) ||
        (e.username && e.username.toLowerCase() === codeToSearch.toLowerCase())
      ) || employees[0];

      if (emp) {
        setLookedUpEmployee(emp);
        setAddressDetails({
          street: [emp.address, emp.address_line_2].filter(Boolean).join(", ") || emp.work_location || emp.base_location || "",
          city: emp.city || emp.district || "",
          state: emp.perm_state || emp.state || "",
          pincode: emp.pincode || "",
          country: emp.perm_country || emp.country || "India",
          phone: emp.mobile || emp.phone || ""
        });
      } else {
        setLookedUpEmployee(null);
      }
    } catch (err) {
      console.error("Error looking up employee:", err);
    } finally {
      setLookingUpEmp(false);
    }
  };

  const fetchQRCode = async (orderId) => {
    if (!orderId) return;

    // If already marked used, don't keep fetching
    if (qrUsed) return;

    setFetchingQR(true);
    try {
      const res = await api.get(`/orders/${orderId}/qr`);
      console.log('QR Polling Response:', res.data);

      // Detection of usage
      if (res.data?.is_used) {
        setQrUsed(true);
        setQrCode(null);
        console.log('QR marked as used by backend');
      } else if (res.data?.qrImage || res.data?.qr || res.data?.qr_code) {
        let code = res.data.qrImage || res.data.qr || res.data.qr_code;
        // Handle relative paths
        if (code && typeof code === 'string' && !code.startsWith('data:') && !code.startsWith('http')) {
          code = `${API_BASE_URL}${code.startsWith('/') ? '' : '/'}${code}`;
        }
        setQrCode(code);
      }
    } catch (err) {
      console.error("Error fetching QR Code:", err);
    } finally {
      setFetchingQR(false);
    }
  };
  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedProducts.length) {
      alert("Select at least one product");
      return;
    }

    if (paymentMode === "UPI" && !razorpayLoaded) {
      alert("Payment gateway is loading. Please wait...");
      return;
    }

    if (!selectedDates || selectedDates.length === 0) {
      alert("Please select at least one date from the calendar");
      return;
    }

    try {
      setSubmitting(true);

      const code = `ADM-${Date.now()}`;
      const item_ids = selectedProducts.flatMap((p) =>
        Array(p.quantity || 1).fill(Number(p.id))
      );
      const perDayTotal = calculateTotal();
      const total_amount = perDayTotal * selectedDates.length;

      const formattedAddress = `${addressDetails.street || ""}, ${addressDetails.city || ""}, ${addressDetails.state || ""}, ${addressDetails.pincode || ""}, ${addressDetails.country || "India"}${addressDetails.phone ? ` - Phone: ${addressDetails.phone}` : ""}`.trim().replace(/^, |, $/g, "");

      // Resolve unit_id with robust fallbacks
      const matchedUnit = units.find(u =>
        u.id === Number(lookedUpEmployee?.division_unit) ||
        u.name === lookedUpEmployee?.division_unit ||
        u.code === lookedUpEmployee?.division_unit
      );

      const finalUnitId = Number(matchedUnit?.id) ||
        Number(lookedUpEmployee?.division_unit) ||
        Number(selectedProducts[0]?.unit_id) ||
        Number(user?.unit_id) ||
        1;

      const payload = {
        code,
        Order_code: code,
        payment_mode: paymentMode,
        item_ids,
        total_amount: Number(total_amount),
        delivery_address: addressDetails.street ? formattedAddress : "Office Delivery",
        emp_code: clerkCode || user?.emp_code || user?.username || "ADMIN",
        unit_id: finalUnitId,
        division_unit: lookedUpEmployee?.division_unit || matchedUnit?.name || selectedProducts[0]?.division_unit || user?.division_unit || "General",
        phone: addressDetails.phone || "0000000000",
        customer_phone: addressDetails.phone || "0000000000",
        employeeCode: clerkCode || user?.emp_code || user?.username || "ADMIN01",
        deliveryAddress: addressDetails.street ? formattedAddress : "Office Delivery",
        dates: selectedDates,
        selectedDates: selectedDates, // Backward compatibility
        order_dates: selectedDates,    // Backward compatibility
        orderDate: selectedDates[0],
        remarks: remarks || "",
      };

      console.log(
        "Submitting order with payload:",
        JSON.stringify(payload, null, 2)
      );

      const createRes = await api.post("/orders/", payload);
      const responseData = createRes.data;
      console.log("Order created successfully - Full Response:", responseData);

      const orderId =
        responseData?.order_id ||
        responseData?.order?.id ||
        responseData?.data?.id ||
        responseData?.id;
      const finalOrder =
        responseData?.order || responseData?.data || responseData;

      if (!orderId) {
        console.error(
          "❌ Order ID extraction failed. Response Data:",
          responseData
        );
        throw new Error("Failed to create order - ID missing in response");
      }

      console.log("Extracted Order ID:", orderId);
      setAppOrderId(orderId);

      if (paymentMode === "FREE" || paymentMode === "GUEST") {
        try {
          const payPayload = {
            emp_code: clerkCode || user?.emp_code || user?.username || "ADMIN"
          };

          // Use the correct endpoint based on payment mode
          const paymentEndpoint = paymentMode === "FREE"
            ? `/orders/${orderId}/pay-free`
            : `/orders/${orderId}/pay-guest`;

          console.log(`Updating ${paymentMode} payment status:`, payPayload);
          const paymentRes = await api.post(paymentEndpoint, payPayload);

          console.log(`✅ ${paymentMode} Payment Response:`, paymentRes.data);

          // Fetch QR code only (GET /orders/:id returns 404)
          try {
            // Skip: const orderRes = await api.get(`/orders/${orderId}`);
            // console.log("📦 Complete Order Data:", orderRes.data);

            // Fetch QR code
            const qrRes = await api.get(`/orders/${orderId}/qr`);
            console.log("🔲 QR Code Response:", qrRes.data);

            // Extract data from responses (use finalOrder since GET /orders/:id doesn't exist)
            const orderData = { ...finalOrder, id: orderId, payment_status: "PAID", dayBills: paymentRes.data?.dayBills || finalOrder?.dayBills || [] };
            const qrImage = qrRes.data?.qrImage;
            const dayBillsData = orderData?.dayBills || paymentRes.data?.dayBills || [];

            console.log("📦 Using Order Data:", orderData);
            console.log("📄 Day Bills:", dayBillsData);

            // Set states for success modal
            if (qrImage) {
              setQrCode(qrImage);
            }

            if (dayBillsData.length > 0) {
              setDayBills(dayBillsData);
            }

            setPaymentStatus("SUCCESS");
            setPaymentDetails({
              order: orderData,
              dayBills: dayBillsData,
              qrImage: qrImage,
              paymentMode: paymentMode
            });
            setFullOrderData(orderData);

            // Auto-print bills
            if (dayBillsData.length > 0) {
              setTimeout(() => {
                handlePrintBills({
                  ...orderData,
                  dayBills: dayBillsData
                });
              }, 500);
            }

            console.log(`✅ ${paymentMode} order completed successfully!`);

          } catch (fetchErr) {
            console.error("Error fetching QR code:", fetchErr);
            // Still show success modal even without QR
            const orderData = {
              ...finalOrder,
              id: orderId,
              payment_status: "PAID",
              dayBills: paymentRes.data?.dayBills || []
            };

            setPaymentStatus("SUCCESS");
            setPaymentDetails({
              order: orderData,
              dayBills: orderData.dayBills || [],
              paymentMode: paymentMode
            });
            setFullOrderData(orderData);

            if (orderData.dayBills && orderData.dayBills.length > 0) {
              setDayBills(orderData.dayBills);
              setTimeout(() => {
                handlePrintBills({
                  ...orderData,
                  dayBills: orderData.dayBills
                });
              }, 1000);
            }

            console.log(`✅ ${paymentMode} order completed (QR unavailable)`);
          }
        } catch (payErr) {
          console.error("Payment status update failed:", payErr.response?.data || payErr);
          const errorMsg = payErr.response?.data?.message || payErr.response?.data?.error || "Unknown error";

          // If order is already paid, treat as success
          if (errorMsg.includes('already paid') || errorMsg.includes('Already paid')) {
            console.warn("Order was already paid, treating as success.");

            setPaymentStatus("SUCCESS");
            const orderData = {
              ...(finalOrder),
              id: orderId,
              payment_status: "PAID",
              dayBills: finalOrder?.dayBills || []
            };
            setPaymentDetails({
              order: orderData,
              dayBills: orderData.dayBills,
              paymentMode: paymentMode
            });
            setFullOrderData(orderData);
            if (orderData.dayBills && orderData.dayBills.length > 0) {
              setDayBills(orderData.dayBills);
              setTimeout(() => {
                handlePrintBills({
                  ...orderData,
                  dayBills: orderData.dayBills
                });
              }, 500);
            }
          } else {
            alert(`Order created but failed to mark as paid: ${errorMsg}`);
          }
        }
      } else if (paymentMode === "UPI") {
        const totalAmountInPaise = Math.round(total_amount * 100);

        const razorpayResponse = await api.post(
          `/orders/${orderId}/create-razorpay-order`,
          {
            order_id: orderId,
            amount: totalAmountInPaise,
            order_code: code,
          }
        );

        console.log(
          "create-razorpay-order Response Data:",
          razorpayResponse.data
        );
        const { razorpay_order_id, amount, key, key_id, razorpay_key } =
          razorpayResponse.data;
        const finalKey = key || key_id || razorpay_key;

        if (!finalKey) {
          throw new Error("Payment initialization failed: API Key missing");
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
          description: `Admin Order #${orderId} - ${code}`,
          order_id: razorpay_order_id,
          handler: async (response) => {
            console.log("Razorpay payment successful. Response:", response);
            try {
              // Backend verification with QR code data
              const verifyRes = await api.post(`/orders/${orderId}/verify-razorpay`, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                emp_code: clerkCode || user?.username || "ADMIN",
              });

              console.log("✅ Admin Payment Verification Response:", verifyRes.data);
              console.log("📦 Order Data:", verifyRes.data?.order);
              console.log("📄 Day Bills:", verifyRes.data?.dayBills);
              console.log("🔲 QR Image Available:", !!verifyRes.data?.qrImage);

              // Extract complete payment response data
              if (verifyRes.data?.qrImage) {
                setQrCode(verifyRes.data.qrImage);
              }

              // Store dayBills from response
              if (verifyRes.data?.dayBills) {
                setDayBills(verifyRes.data.dayBills);
              }

              // Set payment status to success
              setPaymentStatus("SUCCESS");
              setPaymentDetails(verifyRes.data);
              setFullOrderData(verifyRes.data?.order || finalOrder);

              // Auto-print bills after successful payment
              if (verifyRes.data?.dayBills && verifyRes.data.dayBills.length > 0) {
                setTimeout(() => {
                  handlePrintBills({
                    ...verifyRes.data.order,
                    dayBills: verifyRes.data.dayBills
                  });
                }, 1000);
              }

              alert("Payment verified successfully!");
              setSubmitting(false);
            } catch (err) {
              console.error(
                "❌ Payment verification failed:",
                err.response?.data || err
              );
              setPaymentStatus("FAILED");
              alert(
                `Payment verification failed: ${err.response?.data?.error || err.message
                }`
              );
              setSubmitting(false);
            }
          },
          prefill: {
            contact: user?.phone || "9999999999",
            email: user?.email || "admin@cms.com",
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
              setSubmitting(false);
            },
          },
          theme: { color: "#fac639" },
        };

        if (typeof window.Razorpay === "undefined") {
          throw new Error("Razorpay script not loaded properly");
        }

        new window.Razorpay(options).open();
      } else {
        // Handle other payment modes like GUEST if needed
        alert("Order created successfully!");
        setSelectedProducts([]);
      }
    } catch (err) {
      console.error("Order process Error:", err);
      const errorData = err.response?.data;
      const errorMsg = errorData?.error || errorData?.message || err.message || "Invalid order data. Please check selection.";

      setSubmitting(false);
      alert(`Checkout Error: ${errorMsg}`);
    } finally {
      // For UPI, the handler or ondismiss sets submitting false
      // For FREE/GUEST, only set false if not showing success modal
      if (paymentMode !== "UPI" && paymentStatus !== "SUCCESS") {
        setSubmitting(false);
      }
    }
  };
  const handlePrintBills = async (orderData) => {
    const targetOrder = orderData || fullOrderData;
    if (!targetOrder || printing) return;

    setPrinting(true);
    setPrintResults([]);
    setPrintWarning(false);

    try {
      // Use dayBills from state or order data
      const bills = dayBills.length > 0 ? dayBills : (targetOrder.dayBills || []);
      const orderId = targetOrder.order_id || targetOrder.id || appOrderId;

      if (bills.length === 0) {
        console.warn("No dayBills found in order for auto-printing:", targetOrder);
        setPrinting(false);
        return;
      }

      console.log(`🖨️ Attempting to print ${bills.length} bills for order #${orderId}`);

      const results = [];
      for (const bill of bills) {
        if (!bill || !bill.id) continue;

        let success = false;
        let errorMsg = "";

        try {
          // Standard print endpoint
          await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
          success = true;
        } catch (err) {
          console.warn(`Admin print failed for ${bill.id}, trying V2...`);
          try {
            await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
            success = true;
          } catch (v2Err) {
            errorMsg = v2Err.response?.data?.error || v2Err.message;
          }
        }
        results.push({ billId: bill.id, success, error: errorMsg });
      }

      setPrintResults(results);
      if (results.some(r => !r.success)) setPrintWarning(true);
    } catch (err) {
      console.error("Admin print process failed:", err);
    } finally {
      setPrinting(false);
    }
  };

  const handleSinglePrint = async (billId) => {
    const orderId = fullOrderData?.id || fullOrderData?.order_id || appOrderId;
    if (!orderId || !billId || printing) return;

    setPrinting(true);
    try {
      console.log(`🖨️ Manual print trigger for Bill #${billId} (Order #${orderId})`);
      const res = await api.post(`/orders/${orderId}/bills/${billId}/print`);
      const jobId = res.data?.jobId;

      // Update results if it exists in the list
      setPrintResults(prev => prev.map(r =>
        r.billId === billId ? { ...r, success: true, error: "", jobId } : r
      ));

      alert(`Print job #${jobId || ''} queued successfully`);
    } catch (err) {
      console.error("Manual print failed:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Print failed: ${errorMsg}`);

      setPrintResults(prev => prev.map(r =>
        r.billId === billId ? { ...r, success: false, error: errorMsg } : r
      ));
    } finally {
      setPrinting(false);
    }
  };

  // Load Razorpay script
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

  // Debug state changes
  useEffect(() => {
    console.log(`[AdminCheckout] Payment Status: ${paymentStatus}, Order ID: ${appOrderId}`);
  }, [paymentStatus, appOrderId]);
  useEffect(() => {
    if (paymentStatus === "SUCCESS" && appOrderId && !qrUsed) {
      const pollInterval = setInterval(() => {
        fetchQRCode(appOrderId);
      }, 4000);

      return () => clearInterval(pollInterval);
    }
  }, [paymentStatus, appOrderId, qrUsed]);

  // Auto-close success modal after 15 seconds with countdown
  useEffect(() => {
    if (paymentStatus === "SUCCESS") {
      setCountdown(15); // Reset countdown

      // Update countdown every second
      const countInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Close modal after 15 seconds
      const closeTimer = setTimeout(() => {
        console.log("⏱️ Auto-closing success modal after 15 seconds");
        handleNewOrder(); // Reset to new order state
      }, 15000);

      return () => {
        clearInterval(countInterval);
        clearTimeout(closeTimer);
      };
    }
  }, [paymentStatus]);

  const cancelPendingOrder = async (orderId) => {
    if (!orderId) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
    } catch (err) {
      console.error("Cancel order failed:", err);
    }
  };

  const handleNewOrder = () => {
    setSelectedProducts([]);
    setPaymentStatus("IDLE");
    setPaymentDetails(null);
    setAppOrderId(null);
    setPaymentMode("UPI");
    setSubmitting(false);
    setQrCode(null);
    setQrUsed(false);
    setDayBills([]);
    setPrintResults([]);
    setPrintWarning(false);
    setFullOrderData(null);
    setAddressDetails({
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India"
    });
    setClerkCode(""); // Manual entry: always reset to empty
    setSelectedDates([new Date().toISOString().split('T')[0]]);
    setRemarks("");
  };

  // =========================
  // LOAD UNITS
  // =========================
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get("/items/", { params: { limit: 1000 } });
        setProducts(res.data?.items || res.data?.products || []);

        const unitsRes = await api.get("/units");
        let fetchedUnits = Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.units || [];

        if (user?.role === 'unit_admin' && user?.unit_id) {
          fetchedUnits = fetchedUnits.filter(u => u.id === user.unit_id);
          setSelectedUnit(user.unit_id);
        }

        setUnits(fetchedUnits);
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, []);

  // =========================
  // LOAD PRODUCTS BY UNIT
  // =========================
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/items/", {
        params: {
          limit: 1000,
          search: searchTerm
        }
      });

      const productList = res.data?.items || res.data?.products ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);

      setProducts(productList);
    } catch (err) {
      console.error("❌ Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // =========================
  // FILTER PRODUCTS
  // =========================
  // =========================
  // FILTER PRODUCTS
  // =========================
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Activity Check
      if (p.is_active === false || p.is_active === 0 || p.is_active === "0") return false;

      // 2. Unit Filter
      if (selectedUnit !== "ALL" && String(p.unit_id) !== String(selectedUnit)) return false;

      // 3. Search Filter (Client-side fallback)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatches = (p.name || "").toLowerCase().includes(search);
        const nameEnMatches = (p.name_en || "").toLowerCase().includes(search);
        if (!nameMatches && !nameEnMatches) return false;
      }

      return true;
    });
  }, [products, searchTerm, selectedUnit]);

  // =========================
  // MEMOIZED MODAL DATA
  // =========================

  // =========================
  // HELPER FUNCTIONS
  // =========================
  const getProductTotalQty = (productId) => {
    return selectedProducts
      .filter((p) => p.id === productId)
      .reduce((sum, p) => sum + (p.quantity || 0), 0);
  };

  const getProductVariantQty = (productId, variantId) => {
    const found = selectedProducts.find(
      (p) => p.id === productId && p.variant_id === variantId
    );
    return found ? found.quantity : 0;
  };

  const adjustProductQuantity = (product, delta, variantId) => {
    setSelectedProducts((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.id === product.id && (variantId ? p.variant_id === variantId : true)
      );

      if (existingIndex === -1) {
        if (delta > 0) {
          return [
            ...prev,
            {
              ...product,
              quantity: delta,
              variant_id: variantId,
              selectedPrice: product.price || product.base_price
            }
          ];
        }
        return prev;
      }

      const updated = [...prev];
      const nextQty = updated[existingIndex].quantity + delta;

      if (nextQty <= 0) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
      }
      return updated;
    });
  };

  const calculateTotal = () =>
    selectedProducts.reduce(
      (sum, p) => sum + Number(p.selectedPrice || p.base_price || p.price || 0) * (p.quantity || 0),
      0
    );

  const openProductPopup = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    setSelectedPopupProduct(product);
    setPopupQuantity(existing ? existing.quantity : 1);
    setIsPopupOpen(true);
  };

  const handlePopupAddToCart = () => {
    if (!selectedPopupProduct) return;

    const vId = selectedPopupProduct.variants?.[0]?.id || selectedPopupProduct.id;

    setSelectedProducts((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.id === selectedPopupProduct.id && p.variant_id === vId
      );

      const updated = [...prev];
      if (existingIndex !== -1) {
        if (popupQuantity <= 0) {
          updated.splice(existingIndex, 1);
        } else {
          updated[existingIndex] = { ...updated[existingIndex], quantity: popupQuantity };
        }
      } else if (popupQuantity > 0) {
        updated.push({
          ...selectedPopupProduct,
          quantity: popupQuantity,
          variant_id: vId,
          selectedPrice: selectedPopupProduct.price || selectedPopupProduct.base_price
        });
      }
      return updated;
    });

    setIsPopupOpen(false);
    setSelectedPopupProduct(null);
  };

  // =========================
  // SUBMIT ORDER
  // =========================

  if (loading && products.length === 0) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }
  return (
    <>
      {/* Product Selection Popup */}
      {isPopupOpen && selectedPopupProduct && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] w-full max-w-md rounded-[2rem] shadow-2xl border border-[var(--border-default)] overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Item selection</h3>
                <button
                  onClick={() => setIsPopupOpen(false)}
                  className="p-2 hover:bg-[var(--surface-muted)] rounded-full transition-colors"
                >
                  <FiXCircle size={24} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-8">
                <div className="w-32 h-32 rounded-2xl bg-[var(--surface-muted)] overflow-hidden mb-4 border border-[var(--border-default)]">
                  <img
                    src={(() => {
                      const imgUrl = selectedPopupProduct.images?.[0]?.url || selectedPopupProduct.image || selectedPopupProduct.image_path;
                      if (!imgUrl) return noImage;
                      return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
                        ? imgUrl
                        : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                    })()}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => (e.target.src = noImage)}
                  />
                </div>
                <h4 className="text-lg font-bold text-[var(--text-primary)] text-center capitalize mb-1">
                  {selectedPopupProduct.name_en || selectedPopupProduct.name}
                </h4>
                <p className="text-[var(--brand-primary)] font-black text-xl">
                  ₹{parseFloat(selectedPopupProduct.price || selectedPopupProduct.base_price || 0).toFixed(2)}
                </p>
              </div>

              <div className="bg-[var(--surface-muted)]/30 rounded-2xl p-6 mb-8 border border-[var(--border-default)]">
                <p className="text-center text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
                  Select Quantity
                </p>
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() => setPopupQuantity(Math.max(0, popupQuantity - 1))}
                    className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all active:scale-90"
                  >
                    <FaMinus size={14} />
                  </button>
                  <span className="text-4xl font-black text-[var(--text-primary)] w-12 text-center">
                    {popupQuantity}
                  </span>
                  <button
                    onClick={() => setPopupQuantity(popupQuantity + 1)}
                    className="w-12 h-12 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20 hover:scale-110 transition-all active:scale-90"
                  >
                    <FaPlus size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handlePopupAddToCart}
                className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {popupQuantity === 0 ? "Remove Order" : "order Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "SUCCESS" && (
        /* High-Visibility Full-Page Success Overlay */
        <div className="fixed inset-0 z-[99999] bg-[var(--surface-main)] flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
          <div className="w-full sm:max-w-4xl bg-[var(--surface-card)] sm:rounded-[2.5rem] shadow-none sm:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-0 sm:border border-[var(--border-default)] overflow-hidden animate-in zoom-in duration-500 min-h-screen sm:min-h-0">
            <div className="flex flex-col md:flex-row h-full">

              {/* Left Side: Success Animation & Summary */}
              <div className="flex-1 p-6 sm:p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[var(--border-default)] bg-gradient-to-b from-emerald-500/5 to-transparent">
                <img src={successGif} alt="Success" className="h-32 sm:h-56 mx-auto mb-6 sm:mb-8 drop-shadow-2xl" />
                <h1 className="text-2xl sm:text-4xl font-black text-emerald-600 mb-2 sm:mb-4 tracking-tight">Payment Successful!</h1>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest mb-8">
                  <FiCheckCircle /> Transaction Verified
                </div>

                <div className="w-full space-y-3 bg-[var(--surface-muted)]/30 p-6 rounded-2xl border border-[var(--border-default)]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-60 font-medium">Order Reference:</span>
                    <span className="font-bold text-emerald-600 uppercase">#{appOrderId}</span>
                  </div>

                  {/* Day Bills Information */}
                  {dayBills && dayBills.length > 0 && (
                    <div className="border-t border-[var(--border-default)] pt-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Bills Generated ({dayBills.length} days)</p>
                      {dayBills.map((bill, idx) => (
                        <div key={bill.id || idx} className="flex justify-between items-center text-xs bg-[var(--surface-card)] p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--brand-primary)]/30 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)]">
                              <FiPrinter size={12} />
                            </div>
                            <div>
                              <span className="font-bold opacity-80 block">Bill #{bill.id}</span>
                              <span className="text-[10px] opacity-60">{bill.bill_date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">₹{parseFloat(bill.amount || 0).toFixed(2)}</span>
                            <button
                              onClick={() => handleSinglePrint(bill.id)}
                              disabled={printing}
                              className="p-2 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-50"
                              title="Print this bill"
                            >
                              <FiPrinter size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--border-default)]">
                    <span className="opacity-60 font-medium">Total Amount:</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Print Status Report */}
                {dayBills && dayBills.length > 0 && (
                  <div className="w-full mt-6">
                    <div className="p-5 rounded-2xl border border-[var(--border-default)] text-left bg-white dark:bg-black/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 pl-1 flex items-center gap-2">
                        <FiPrinter size={12} /> Print Status Report
                      </p>
                      {printing ? (
                        <div className="flex items-center gap-3 py-2">
                          <FiRefreshCw className="animate-spin text-amber-500" />
                          <span className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Printer working...</span>
                        </div>
                      ) : printResults.length > 0 ? (
                        <div className="space-y-3">
                          {printResults.map((result, index) => (
                            <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <FiPrinter className={result.success ? "text-emerald-500" : "text-rose-400"} />
                                <span className="font-medium opacity-80 uppercase tracking-tight">Bill #{result.billId || 'N/A'}</span>
                              </div>
                              <span className={`font-black tracking-tighter ${result.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {result.success ? '✓ SENT' : '✕ FAILED'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 italic">Auto-print process pending...</p>
                      )}
                    </div>

                    {printWarning && (
                      <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center gap-2 animate-bounce">
                        <FiXCircle />
                        <span className="text-[10px] font-black uppercase">Printing issues detected!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: Order Detail & QR */}
              <div id="printable-bill" className="flex-1 p-8 sm:p-12 flex flex-col bg-[var(--surface-card)]">
                <div className="mb-8">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 flex items-center gap-2">
                    <FiShoppingCart /> Items Breakdown
                  </h2>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {selectedProducts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-[var(--border-default)]/50 pb-3">
                        <div className="text-left">
                          <p className="font-bold text-sm text-[var(--text-primary)]">{p.name_en || p.name}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold">Qty: {p.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm">₹{((p.selectedPrice || p.price || 0) * (p.quantity || 1)).toFixed(2)}</p>
                          <p className="text-[10px] font-bold opacity-30">{p.quantity} x ₹{p.selectedPrice || p.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Persistent QR Section */}
                <div className="mt-auto flex flex-col items-center p-6 bg-[var(--surface-muted)]/20 rounded-3xl border border-[var(--border-default)] relative group">
                  <div className="absolute inset-0 bg-[var(--brand-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>

                  {fetchingQR && !qrCode ? (
                    <div className="w-32 h-32 flex flex-col items-center justify-center animate-pulse gap-2">
                      <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" />
                      <p className="text-[8px] font-black opacity-40 uppercase">Checking QR...</p>
                    </div>
                  ) : qrUsed ? (
                    <div className="w-32 h-32 flex flex-col items-center justify-center text-rose-500 text-center">
                      <FiCheckCircle size={32} className="mb-2" />
                      <p className="text-[10px] font-black uppercase">QR USED</p>
                    </div>
                  ) : qrCode ? (
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-lg">
                      <img src={qrCode} alt="QR" className="w-32 h-32 object-contain" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-[8px] opacity-40 font-bold uppercase">QR Unavailable</p>
                    </div>
                  )}
                  <p className="mt-4 text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest">Show for verification</p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={handleNewOrder}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all sm:col-span-2"
                  >
                    <FiPlusCircle /> NEW ORDER ({countdown}s)
                  </button>
                  <button
                    onClick={() => handlePrintBills()}
                    disabled={printing}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-2xl font-black text-xs border border-[var(--border-default)] hover:bg-[var(--surface-card)] transition-all disabled:opacity-50"
                  >
                    <FiPrinter /> {printing ? "PRINTING..." : "THERMAL"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-500/10 text-blue-500 rounded-2xl font-black text-xs border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                  >
                    <FiPrinter /> SYSTEM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8 animate-slide-up opacity-0">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                {"Orders".split("").map((char, i) => (
                  <span
                    key={i}
                    className="animate-letter-pop"
                    style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </h1>
            </div>

            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--surface-card)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-2xl font-bold text-sm shadow-sm border border-[var(--border-default)] transition-all hover:scale-105 active:scale-95"
            >
              <FiCamera size={18} className="text-[var(--brand-primary)]" />
              <span>SCAN QR</span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-8 min-w-0">

              {/* Products Selection Card */}
              <div className="p-4 sm:p-6 rounded-2xl border bg-[var(--surface-card)] border-[var(--border-default)] shadow-lg overflow-hidden">
                {/* Header with Unit Filter */}
                <div className="mb-6 border-b border-[var(--border-default)] pb-6">
                  <div className="flex justify-between items-center">
                    <div className="text-[var(--brand-primary)] font-bold text-lg uppercase tracking-wider">
                      ALL ITEMS
                    </div>
                  </div>
                </div>

                <div
                  style={{ animationDelay: '100ms' }}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-up opacity-0"
                >
                  {/* <h2 className="text-xl font-medium text-[var(--text-primary)] uppercase tracking-tight">
                    {"All Items".split("").map((char, i) => (
                      <span
                        key={i}
                        className="animate-letter-pop"
                        style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    ))}
                  </h2> */}

                  <div className="relative w-full sm:w-64 group">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-12 py-3 text-sm text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-secondary)]/50"
                    />
                    <FiSearch
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors"
                      size={18}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 max-h-[60vh] sm:max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {Array.isArray(filteredProducts) &&
                    filteredProducts.map((product) => {
                      const totalQty = getProductTotalQty(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`group p-3 rounded-2xl border-2 transition-all relative overflow-hidden flex flex-col ${totalQty > 0
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                            : "border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 bg-[var(--surface-main)]"
                            }`}
                        >
                          <div
                            onClick={() => openProductPopup(product)}
                            className="cursor-pointer"
                          >
                            <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-[var(--surface-muted)]">
                              <img
                                src={(() => {
                                  const imgUrl = product.images?.[0]?.url || product.image || product.image_path;
                                  if (!imgUrl) return noImage;
                                  return (imgUrl.startsWith('http') || imgUrl.startsWith('blob:'))
                                    ? imgUrl
                                    : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                                })()}
                                className="w-full h-full object-contain transition-transform group-hover:scale-110 p-1"
                                onError={(e) => (e.target.src = noImage)}
                              />
                            </div>
                            <div className="text-left mb-3">
                              <div className="font-medium text-sm truncate text-[var(--text-primary)] capitalize">
                                {product.name_en || product.name}
                              </div>
                              <div className="text-xs font-semibold text-[var(--brand-primary)] mt-1">
                                ₹{parseFloat(product.price || product.base_price || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustProductQuantity(product, -1, product.variants?.[0]?.id || product.id);
                              }}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] transition-all active:scale-95 hover:bg-rose-500 hover:text-white"
                            >
                              <FaMinus className="text-base sm:text-lg" />
                            </button>

                            <span className={`text-xl font-black min-w-[24px] text-center ${totalQty > 0 ? "text-[var(--brand-primary)]" : "text-[var(--text-secondary)] opacity-50"}`}>
                              {totalQty}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustProductQuantity(product, 1, product.variants?.[0]?.id || product.id);
                              }}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white transition-all active:scale-95 shadow-lg shadow-[var(--brand-primary)]/20"
                            >
                              <FaPlus className="text-base sm:text-lg" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Cart & Payment Summary Sidebar */}
            <div ref={summaryRef} className="w-full lg:w-[380px] space-y-6 lg:sticky lg:top-8 h-fit">
              <div className="p-4 sm:p-6 rounded-2xl border bg-[var(--surface-card)] border-[var(--border-default)] shadow-xl relative">
                {/* Accent decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                <h2 className="text-xl font-medium mb-8 text-[var(--text-primary)] flex justify-between items-center px-1">
                  Order Summary
                </h2>

                <div className="mb-8 space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider flex items-center gap-2">
                      Employee Code
                    </label>
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      value={clerkCode}
                      onChange={(e) => setClerkCode(e.target.value)}
                      placeholder="Enter employee code..."
                      className="w-full px-12 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] text-sm font-medium transition-all shadow-inner text-center placeholder:text-[var(--text-secondary)]/50"
                    />
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors" size={18} />
                    {lookingUpEmp && (
                      <FiRefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-primary)] animate-spin" size={16} />
                    )}
                  </div>
                  {lookedUpEmployee?.division_unit && !lookingUpEmp && (
                    <div className="mx-1 p-3 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 animate-in fade-in slide-in-from-top-1 duration-300">
                      <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest mb-1">Unit</p>
                      <p className="text-xs text-[var(--text-primary)] font-black leading-relaxed uppercase">
                        {lookedUpEmployee.division_unit}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-6 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider flex items-center gap-2">
                      Dates
                    </label>
                  </div>

                  <div className="bg-[var(--surface-main)] rounded-2xl p-4 border border-[var(--border-default)] shadow-sm transition-colors duration-200">
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
                      >
                        <FiChevronLeft className="text-lg" />
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>

                      <button
                        onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
                      >
                        <FiChevronRight className="text-lg" />
                      </button>
                    </div>

                    {/* Select All Checkbox */}
                    <div className="flex justify-center mb-4">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--brand-primary)]">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                          checked={(() => {
                            // Check if all selectable days in current view month are selected
                            const year = calendarViewDate.getFullYear();
                            const month = calendarViewDate.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            let selectableDaysCount = 0;
                            let selectedSelectableCount = 0;

                            for (let i = 1; i <= daysInMonth; i++) {
                              const date = new Date(year, month, i);
                              if (!isDateDisabled(date)) {
                                selectableDaysCount++;
                                const d = toLocalDateString(date);
                                if (selectedDates.includes(d)) {
                                  selectedSelectableCount++;
                                }
                              }
                            }
                            return selectableDaysCount > 0 && selectableDaysCount === selectedSelectableCount;
                          })()}
                          onChange={(e) => {
                            const year = calendarViewDate.getFullYear();
                            const month = calendarViewDate.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();

                            if (e.target.checked) {
                              // Select all SELECTABLE days
                              const newSelection = new Set(selectedDates);
                              for (let i = 1; i <= daysInMonth; i++) {
                                const date = new Date(year, month, i);
                                if (!isDateDisabled(date)) {
                                  newSelection.add(toLocalDateString(date));
                                }
                              }
                              setSelectedDates(Array.from(newSelection));
                            } else {
                              // Deselect all for current month
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

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[11px] font-semibold text-[var(--text-secondary)] py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = calendarViewDate.getFullYear();
                        const month = calendarViewDate.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const days = [];

                        // Empty slots
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} className="h-10 sm:h-8" />);
                        }

                        // Days
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
                              className={`h-10 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${isSelected
                                ? 'bg-[var(--brand-primary)] text-white shadow-md'
                                : isToday && !isDisabled
                                  ? 'text-[var(--brand-primary)] font-bold bg-[var(--brand-primary)]/10'
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

                    <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-muted)]/10 -mx-4 px-4 py-2 sm:mx-0 sm:rounded-xl">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total days</span>
                      <span className="text-lg font-black text-[var(--brand-primary)]">{selectedDates.length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                  {selectedProducts.length === 0 ? (
                    <p className="text-center text-[var(--text-secondary)] text-sm py-4">No products selected</p>
                  ) : (
                    selectedProducts.map((p, idx) => (
                      <div key={`${p.id}-${idx}`} className="flex justify-between items-start text-sm p-3 rounded-2xl bg-[var(--surface-main)] border border-transparent hover:border-[var(--brand-primary)]/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-[var(--text-primary)] capitalize mb-1">{p.name_en || p.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-[var(--brand-primary)] text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                              QTY {p.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-black text-[var(--text-primary)]">₹{(Number(p.selectedPrice || p.base_price || p.price || 0) * p.quantity).toFixed(2)}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">₹{Number(p.selectedPrice || p.base_price || p.price || 0).toFixed(2)} / ea</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2 border-t border-[var(--border-default)] pt-4 mb-6">
                  <div className="flex justify-between items-center text-[var(--text-secondary)]">
                    <span className="text-[10px] font-black uppercase tracking-widest">Total Items</span>
                    <span className="font-black text-sm">{selectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-medium text-[var(--text-secondary)] tracking-widest uppercase">
                      Grand Total
                    </span>
                    <span className="text-2xl sm:text-3xl font-semibold text-[var(--brand-primary)]">
                      ₹{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
                  Payment Mode
                </label>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <button
                    onClick={() => setPaymentMode("UPI")}
                    className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "UPI"
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
                      }`}
                  >
                    UPI
                  </button>
                  <button
                    onClick={() => setPaymentMode("FREE")}
                    className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "FREE"
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
                      }`}
                  >
                    FREE MEALS
                  </button>
                  <button
                    onClick={() => setPaymentMode("GUEST")}
                    className={`p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all ${paymentMode === "GUEST"
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
                      }`}
                  >
                    GUEST
                  </button>
                </div>

                {(paymentMode === "FREE" || paymentMode === "GUEST") && (
                  <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
                      Reference  <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={`Enter ${paymentMode === 'FREE' ? 'Free Meal' : 'Guest'} details...`}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] min-h-[80px] text-sm font-medium resize-none transition-all placeholder:text-[var(--text-secondary)]/50"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Address Section */}

              {/* PAYMENT STATUS & CONTROLS */}
              <div className="mt-6">
                {paymentStatus !== "SUCCESS" && (
                  <>
                    {paymentStatus === "FAILED" && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-4 text-sm text-red-600 flex items-center justify-center gap-2">
                        <FaTimes /> Payment Failed or Cancelled. Please try again.
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting || selectedProducts.length === 0 || selectedDates.length === 0}
                      className={`w-full py-4 rounded-xl text-lg font-semibold tracking-tight transition-all active:scale-95 shadow-xl ${submitting || selectedProducts.length === 0 || selectedDates.length === 0
                        ? "opacity-50 cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                        : "bg-gradient-to-br from-[var(--brand-primary)] to-[#ea580c] text-white border border-transparent hover:from-white hover:to-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:translate-y-[-2px] hover:shadow-[var(--brand-primary)]/20"
                        }`}
                    >
                      {submitting
                        ? "Processing..."
                        : paymentStatus === "FAILED" ? "Retry Payment" : "Create & Print Bill"
                      }
                    </button>
                  </>
                )}
              </div>

              <p className="text-[10px] text-center mt-4 text-[var(--text-secondary)] font-medium">
                {paymentStatus === "SUCCESS"
                  ? "Order marked as PAID in admin records."
                  : "Admin order will be automatically logged and printed."}
              </p>
            </div>
          </div>
        </div>

      </AdminLayout >

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
          onError={(err) => console.warn(err)}
        />
      )}

      {/* Verification Result Modal */}
      {(scanResult || scanError) && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeScanResult}>
          <div className="bg-[var(--surface-card)] w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl animate-in zoom-in duration-300 relative border border-[var(--border-default)]" onClick={e => e.stopPropagation()}>
            <button onClick={closeScanResult} className="absolute top-4 right-4 p-2 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-main)]">
              <FiX size={20} />
            </button>

            {scanResult ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                  <FiPackage size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-500 mb-1">VERIFIED!</h3>
                  <p className="text-[var(--text-secondary)] font-medium text-sm">Order has been successfully verified.</p>
                </div>

                <div className="w-full bg-[var(--surface-muted)] rounded-2xl p-4 text-left border border-[var(--border-default)] mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Order ID</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">#{scanResult.order?.code || scanResult.order?.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Customer</span>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{scanResult.order?.customer_name || scanResult.order?.customer?.username || 'Guest'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                  <FiX size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-red-500 mb-1">FAILED</h3>
                  <p className="text-[var(--text-secondary)] font-medium text-sm">Verification failed.</p>
                </div>
                <p className="text-xs font-mono bg-red-500/5 text-red-600 p-3 rounded-xl w-full break-all border border-red-500/10">
                  {scanError}
                </p>
              </div>
            )}

            <button
              onClick={closeScanResult}
              className="w-full mt-6 py-4 rounded-xl bg-[var(--brand-primary)] text-[var(--text-inverse)] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              {scanResult ? 'Done' : 'Try Again'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCheckout;


