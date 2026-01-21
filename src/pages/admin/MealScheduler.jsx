import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout.jsx';
import api, { API_BASE_URL } from '../../config/api.js';
import {
    FiCalendar, FiDownload, FiCheck, FiArrowRight, FiSettings,
    FiCoffee, FiSun, FiMoon, FiCamera, FiTrash2, FiRefreshCcw,
    FiChevronLeft, FiChevronRight, FiGrid, FiList, FiClock, FiActivity,
    FiUpload
} from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';

const MealScheduler = () => {
    const { isDark } = useTheme();
    const now = new Date();

    // Helper for safe local ISO-like string (YYYY-MM-DD)
    const toLocalISO = (d) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('data:') || path.startsWith('http')) return path;
        return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const [startDate, setStartDate] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)));
    const [schedule, setSchedule] = useState([]);
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [itemSearch, setItemSearch] = useState({}); // Tracking search per slot
    const [showDropdown, setShowDropdown] = useState({}); // Tracking dropdown visibility per slot

    // Auto-reset selection when plan shifts
    useEffect(() => {
        setActiveDayIndex(0);
        setItemSearch({});
        setShowDropdown({});
    }, [startDate]);

    // Reset search when changing active day within same batch
    useEffect(() => {
        setItemSearch({});
        setShowDropdown({});
    }, [activeDayIndex]);

    // Month & Year selection for quick navigation
    const [navMonth, setNavMonth] = useState(now.getMonth());
    const [navYear, setNavYear] = useState(now.getFullYear());

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 2 + i);

    // Meal Types
    const mealTypes = [
        { id: 'breakfast', label: 'Breakfast', time: '08:00 AM', icon: <FiCoffee />, color: 'amber' },
        { id: 'snack1', label: 'Mid-Day Snack', time: '11:00 AM', icon: <FiActivity />, color: 'emerald' },
        { id: 'lunch', label: 'Lunch', time: '01:30 PM', icon: <FiSun />, color: 'orange' },
        { id: 'snack2', label: 'Evening Snack', time: '05:00 PM', icon: <FiClock />, color: 'blue' },
        { id: 'dinner', label: 'Dinner', time: '08:30 PM', icon: <FiMoon />, color: 'indigo' }
    ];



    const [masterPlan, setMasterPlan] = useState({});

    const fetchItems = async () => {
        try {
            const res = await api.get('/items/', { params: { limit: 1000 } });
            setItems(res.data?.items || []);

            // Extract unique categories
            const cats = ['All', ...new Set((res.data?.items || []).map(item => item.category || 'General'))];
            setCategories(cats);
        } catch (err) {
            console.error("Error fetching items:", err);
        }
    };

    const fetchPlan = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/menu/month?year=${navYear}&month=${navMonth + 1}`);

            // Handle both wrapped response ({ success: true, plan: [...] }) and raw array response ([...])
            let planData = [];
            if (Array.isArray(response.data)) {
                planData = response.data;
            } else {
                planData = response.data.plans || response.data.plan || [];
            }

            // Proceed if we have data, or if explicit success is true
            if ((planData.length > 0) || (response.data && response.data.success)) {
                const planMap = {};
                let earliestDate = null;

                // Check if the first item has any of the day-slot fields
                const isOldStructure = planData.length > 0 && (planData[0].breakfast || planData[0].Breakfast || planData[0].lunch);

                if (isOldStructure) {
                    planData.forEach((p, index) => {
                        const dayIdx = p.day_index !== undefined ? parseInt(p.day_index) : index;
                        if (p.date && dayIdx === 0) earliestDate = p.date;

                        // Use date if available, otherwise fallback to index (though we want to move away from index)
                        const key = p.date || dayIdx;

                        planMap[key] = {
                            breakfast: p.breakfast || p.Breakfast || '',
                            snack1: p.snack1 || p.Snack1 || '',
                            lunch: p.lunch || p.Lunch || '',
                            snack2: p.snack2 || p.Snack2 || '',
                            dinner: p.dinner || p.Dinner || '',
                            images: {
                                breakfast: p.breakfast_image || p.Breakfast_image || p.Breakfast_Image || null,
                                snack1: p.snack1_image || p.Snack1_image || p.Snack1_Image || null,
                                lunch: p.lunch_image || p.Lunch_image || p.Lunch_Image || null,
                                snack2: p.snack2_image || p.Snack2_image || p.Snack2_Image || null,
                                dinner: p.dinner_image || p.Dinner_image || p.Dinner_Image || null
                            }
                        };
                    });
                } else {
                    // New Flat Structure: [{date, meal_type, item_id, image_url}, ...]
                    // We need to group by date to find day_index
                    // Note: This logic assumes dates are consistent with the current rotation
                    // Sort by ID to ensure deterministic assignment of multi-entry types like 'Snack'
                    const sortedPlanData = [...planData].sort((a, b) => (a.id || 0) - (b.id || 0));

                    const datesInResponse = [...new Set(sortedPlanData.map(p => p.date))].sort();
                    if (datesInResponse[0]) earliestDate = datesInResponse[0];

                    sortedPlanData.forEach(p => {
                        // Find which day this date corresponds to in our current schedule
                        // If we don't have schedule yet, we'll have to group by date first
                        const pDate = p.date;
                        // Use a temporary map to store by date first
                        if (!planMap[pDate]) {
                            planMap[pDate] = {
                                breakfast: '', snack1: '', lunch: '', snack2: '', dinner: '',
                                images: { breakfast: null, snack1: null, lunch: null, snack2: null, dinner: null }
                            };
                        }

                        let mealType = (p.meal_type || '').toLowerCase();

                        // Handle 'snack' mapping to snack1/snack2 slots
                        if (mealType === 'snack') {
                            if (!planMap[pDate].snack1) {
                                mealType = 'snack1';
                            } else {
                                mealType = 'snack2';
                            }
                        }

                        if (['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'].includes(mealType)) {
                            // Store the ID for saving, but we can also store the name for display fallback
                            const itemId = p.item_id || p.item?.id || '';
                            const itemName = p.item?.name_en || p.item_name || ''; // Capture name from item object

                            planMap[pDate][mealType] = itemId;
                            // Store name in a separate property if needed, or rely on render lookup.
                            // To support fallback when item not in list, let's store it in a parallel structure or special field?
                            // Actually, let's just make sure we use this name if lookup fails.
                            // We can store a composite object or just use a side-map. 
                            // Easier hack: If we have a name, maybe pre-populate the 'items' cache or just use it.
                            // Let's attach the name to the plan entry for direct use in the input/table values if items lookup fails.
                            // For now, let's stick to storing ID. We will improve the render logic to use a "loaded names" map if we really need to.
                            // BUT wait, the input value logic tries to find name from 'items'. 
                            // If 'items' doesn't have it, we show ID. 
                            // We should probably add this item to our local 'items' state if it's not there!
                            if (itemId && itemName) {
                                setItems(prev => {
                                    if (!prev.find(i => i.id === itemId)) {
                                        return [...prev, { id: itemId, name_en: itemName, category: 'General', price: 0 }];
                                    }
                                    return prev;
                                });
                            }

                            // Try to get image from p.image_url, then p.image, then p.item.image_path
                            planMap[pDate].images[mealType] = p.image_url || p.image || p.item?.image_path || null;
                        }
                    });

                    // After grouped by date, we need to map those dates to indices 0..29
                    // This is tricky because indices depend on the current schedule (skipping Sundays)
                    // For now, we'll let the second useEffect (which build the schedule) handle the mapping 
                    // if we store the plan entries by date. 
                    // But wait, masterPlan[count] is used. 
                    // Let's just store them by their relative order for now if day_index is missing.
                }

                if (earliestDate) {
                    setStartDate(earliestDate);
                    const d = new Date(earliestDate);
                    setNavMonth(d.getMonth());
                    setNavYear(d.getFullYear());
                }

                setMasterPlan(planMap);
            } else {
                setMasterPlan({});
            }
        } catch (error) {
            console.error("Failed to fetch meal plan:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlan();
        fetchItems();
    }, [navMonth, navYear]);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    useEffect(() => {
        const result = [];
        const start = new Date(startDate);
        let count = 0;
        let dayOffset = 0;

        while (count < 30) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + dayOffset);
            const dayIdx = currentDate.getDay();
            if (dayIdx !== 0) {
                const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                result.push({
                    date: dStr,
                    day: daysOfWeek[dayIdx],
                    dayNum: count + 1,
                    meals: masterPlan[dStr] || masterPlan[count]
                });
                count++;
            }
            dayOffset++;
            if (dayOffset > 100) break;
        }
        setSchedule(result);
    }, [startDate, masterPlan]);

    const handleMealChange = (scheduleIdx, mealId, value) => {
        const item = schedule[scheduleIdx];
        if (!item) return;
        const dStr = item.date;

        setMasterPlan(prev => ({
            ...prev,
            [dStr]: { ...(prev[dStr] || {}), [mealId]: value }
        }));
    };

    const handleImageChange = (scheduleIdx, mealId, file) => {
        if (!file) return;
        const item = schedule[scheduleIdx];
        if (!item) return;
        const dStr = item.date;

        const reader = new FileReader();
        reader.onloadend = () => {
            setMasterPlan(prev => {
                const currentDay = prev[dStr] || { images: {} };
                return {
                    ...prev,
                    [dStr]: {
                        ...currentDay,
                        images: { ...(currentDay.images || {}), [mealId]: reader.result }
                    }
                };
            });
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (scheduleIdx, mealId) => {
        const item = schedule[scheduleIdx];
        if (!item) return;
        const dStr = item.date;

        setMasterPlan(prev => {
            const currentDay = prev[dStr] || { images: {} };
            return {
                ...prev,
                [dStr]: {
                    ...currentDay,
                    images: { ...(currentDay.images || {}), [mealId]: null }
                }
            };
        });
    };

    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').filter(r => r.trim()).map(row => row.split(','));
            if (rows.length < 2) return;

            const newPlan = { ...masterPlan };
            rows.slice(1).forEach((row) => {
                if (row.length >= 6) {
                    const dStr = (row[0] || '').replace(/"/g, '').trim();
                    if (dStr) {
                        newPlan[dStr] = {
                            ...(newPlan[dStr] || {}),
                            breakfast: (row[3] || '').replace(/"/g, '').trim() || (newPlan[dStr]?.breakfast || ''),
                            snack1: (row[4] || '').replace(/"/g, '').trim() || (newPlan[dStr]?.snack1 || ''),
                            lunch: (row[5] || '').replace(/"/g, '').trim() || (newPlan[dStr]?.lunch || ''),
                            snack2: (row[6] || '').replace(/"/g, '').trim() || (newPlan[dStr]?.snack2 || ''),
                            dinner: (row[7] || '').replace(/"/g, '').trim() || (newPlan[dStr]?.dinner || ''),
                        };
                    }
                }
            });
            setMasterPlan(newPlan);
        };
        reader.readAsText(file);
    };

    const exportToCSV = () => {
        const headers = ["Date", "Day", "Plan Day", "Breakfast", "Mid-Day Snack", "Lunch", "Evening Snack", "Dinner"];
        const rows = schedule.map(item => [
            item.date, item.day, `Day ${item.dayNum}`,
            item.meals?.breakfast || '', item.meals?.snack1 || '', item.meals?.lunch || '', item.meals?.snack2 || '', item.meals?.dinner || ''
        ]);
        const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `meal_plan_${startDate}.csv`);
        link.click();
    };

    const handleSavePlan = async (specificDayIdx = null) => {
        setIsSaving(true);
        try {
            let plansToSave = [];

            if (specificDayIdx !== null) {
                const item = schedule[specificDayIdx];
                if (!item) return;

                mealTypes.forEach(type => {
                    const itemId = item.meals?.[type.id];
                    if (itemId) {
                        plansToSave.push({
                            date: item.date,
                            Date: item.date, // Try capital D just in case
                            meal_type: type.id,
                            item_id: itemId,
                            image_url: item.meals?.images?.[type.id] || null
                        });
                    }
                });
            } else {
                schedule.forEach((item) => {
                    mealTypes.forEach(type => {
                        const itemId = item.meals?.[type.id];
                        if (itemId) {
                            plansToSave.push({
                                date: item.date,
                                Date: item.date,
                                meal_type: type.id,
                                item_id: itemId,
                                image_url: item.meals?.images?.[type.id] || null
                            });
                        }
                    });
                });
            }

            if (plansToSave.length === 0) {
                alert("Please select at least one item before saving.");
                setIsSaving(false);
                return;
            }

            // The backend createMenuPlan handles one item at a time
            // So we send individual requests for each plan entry
            const savePromises = plansToSave.map(p => {
                let backendMealType = p.meal_type;
                if (p.meal_type === 'snack1' || p.meal_type === 'snack2') {
                    backendMealType = 'Snack';
                } else {
                    // Capitalize first letter for Breakfast, Lunch, Dinner
                    backendMealType = p.meal_type.charAt(0).toUpperCase() + p.meal_type.slice(1);
                }

                return api.post('/menu/plan', {
                    date: p.date,
                    meal_type: backendMealType,
                    item_id: p.item_id,
                    is_active: true
                });
            });

            await Promise.all(savePromises);

            alert(specificDayIdx !== null ? "Day updated successfully!" : "Full rotation saved successfully!");
            fetchPlan();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save meal plan.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!window.confirm("This will replace current plan with auto-generated items. Continue?")) return;
        setLoading(true);
        try {
            const response = await api.get(`/menu/generate?startDate=${startDate}`);
            if (response.data.success) {
                const newPlan = { ...masterPlan };
                response.data.plan.forEach(p => {
                    const scheduleItem = schedule[p.day_index];
                    if (scheduleItem) {
                        const dStr = scheduleItem.date;
                        newPlan[dStr] = {
                            breakfast: p.breakfast,
                            snack1: p.snack1,
                            lunch: p.lunch,
                            snack2: p.snack2,
                            dinner: p.dinner,
                            images: {
                                breakfast: p.breakfast_image,
                                snack1: p.snack1_image,
                                lunch: p.lunch_image,
                                snack2: p.snack2_image,
                                dinner: p.dinner_image
                            }
                        };
                    }
                });
                setMasterPlan(newPlan);
            }
        } catch (error) {
            console.error("Generation failed:", error);
            if (error.response?.status === 400) {
                alert(error.response.data.error || "Not enough active items to generate a plan.");
            } else {
                alert("An error occurred while generating the plan.");
            }
        } finally {
            setLoading(false);
        }
    };

    const activeDayData = schedule[activeDayIndex] || {};
    const activeDayMeals = activeDayData.meals || { images: {} };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-[var(--surface-main)] p-4 sm:p-8 font-['Inter', sans-serif]">
                <div className="max-w-7xl mx-auto space-y-10">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[var(--border-default)] pb-8 px-2 sm:px-0">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight sm:tracking-[0.05em] text-[var(--text-primary)]">
                                {"Meal Scheduler".split("").map((char, i) => (
                                    <span
                                        key={i}
                                        className="animate-letter-pop inline-block"
                                        style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
                                    >
                                        {char === " " ? "\u00A0" : char}
                                    </span>
                                ))}
                            </h1>
                        </div>

                        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3">
                            <input
                                type="file"
                                id="bulk-upload"
                                accept=".csv"
                                className="hidden"
                                onChange={handleBulkUpload}
                            />
                            {/* <button
                                onClick={handleAutoGenerate}
                                className="group flex items-center justify-center gap-2 bg-[var(--surface-card)] text-[var(--brand-primary)] border border-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white px-3 sm:px-5 py-3 rounded-2xl transition-all duration-300 font-bold text-[10px] sm:text-xs md:text-sm shadow-sm"
                            >
                                <FiRefreshCcw className={`${loading ? 'animate-spin' : ''}`} />
                                <span className="whitespace-nowrap">Auto Generate</span>
                            </button> */}
                            {/* <button
                                onClick={() => document.getElementById('bulk-upload').click()}
                                className="group flex items-center justify-center gap-2 bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--brand-primary)] hover:text-white px-3 sm:px-5 py-3 rounded-2xl transition-all duration-300 font-bold text-[10px] sm:text-xs md:text-sm shadow-sm"
                            >
                                <FiUpload className="group-hover:-translate-y-1 transition-transform duration-300" />
                                <span className="whitespace-nowrap">Bulk Upload</span>
                            </button> */}
                            <button
                                onClick={handleSavePlan}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 px-3 sm:px-6 py-3 landscape:py-0.5 landscape:h-7 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all font-bold text-[10px] sm:text-xs md:text-sm landscape:text-[9px] disabled:opacity-50"
                            >
                                {isSaving ? <FiRefreshCcw className="animate-spin" /> : <FiCheck />}
                                <span className="whitespace-nowrap">Update Plan</span>
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90 px-3 sm:px-6 py-3 landscape:py-0.5 landscape:h-7 rounded-2xl shadow-xl shadow-[var(--brand-primary)]/20 transition-all font-bold text-[10px] sm:text-xs md:text-sm landscape:text-[9px]"
                            >
                                <FiDownload />
                                <span className="whitespace-nowrap">Export Excel</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                        {/* 1. Calendar Widget (Left) */}
                        <div className="xl:col-span-4 space-y-8 h-full">

                            {/* Premium Calendar Container */}
                            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-black/5 dark:shadow-none relative overflow-hidden group/cal">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--brand-primary)]/10 blur-[80px] -mr-20 -mt-20 group-hover/cal:bg-[var(--brand-primary)]/20 transition-colors" />

                                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                                    <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-[var(--brand-primary)] rounded-full" />
                                        Calendar
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setNavMonth(now.getMonth()); setNavYear(now.getFullYear()); }}
                                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 landscape:py-0.5 landscape:h-6 bg-[var(--surface-main)] text-[var(--brand-primary)] rounded-lg hover:bg-[var(--brand-primary)] hover:text-white transition-all"
                                        >
                                            Today
                                        </button>
                                        <button onClick={() => { if (navMonth === 0) { setNavMonth(11); setNavYear(navYear - 1); } else { setNavMonth(navMonth - 1); } }} className="p-2 hover:bg-[var(--surface-main)] rounded-xl transition-all text-[var(--text-primary)]"><FiChevronLeft /></button>
                                        <button onClick={() => { if (navMonth === 11) { setNavMonth(0); setNavYear(navYear + 1); } else { setNavMonth(navMonth + 1); } }} className="p-2 hover:bg-[var(--surface-main)] rounded-xl transition-all text-[var(--text-primary)]"><FiChevronRight /></button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        <select
                                            value={navMonth}
                                            onChange={(e) => setNavMonth(parseInt(e.target.value))}
                                            className="bg-transparent text-[10px] sm:text-xs md:text-sm font-black text-[var(--brand-primary)] uppercase tracking-widest border-none focus:ring-0 cursor-pointer hover:opacity-70 transition-opacity p-1"
                                        >
                                            {months.map((m, i) => <option key={m} value={i} className="bg-[var(--surface-card)] text-[var(--text-primary)]">{m}</option>)}
                                        </select>
                                        <select
                                            value={navYear}
                                            onChange={(e) => setNavYear(parseInt(e.target.value))}
                                            className="bg-transparent text-[10px] sm:text-xs md:text-sm font-black text-[var(--brand-primary)] uppercase tracking-widest border-none focus:ring-0 cursor-pointer hover:opacity-70 transition-opacity p-1"
                                        >
                                            {years.map(y => <option key={y} value={y} className="bg-[var(--surface-card)] text-[var(--text-primary)]">{y}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                            <div key={d} className="text-[10px] font-black text-[var(--text-secondary)] opacity-40">{d}</div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                        {(() => {
                                            const date = new Date(navYear, navMonth, 1);
                                            const days = [];
                                            for (let i = 0; i < date.getDay(); i++) days.push(null);
                                            while (date.getMonth() === navMonth) { days.push(new Date(date)); date.setDate(date.getDate() + 1); }

                                            return days.map((day, i) => {
                                                if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
                                                const isSunday = day.getDay() === 0;
                                                const dStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                                const scheduleIdx = schedule.findIndex(item => item.date === dStr);
                                                const isActive = scheduleIdx !== -1 && activeDayIndex === scheduleIdx;
                                                const isStart = startDate === dStr;
                                                const isPartOfSchedule = scheduleIdx !== -1;

                                                return (
                                                    <button
                                                        key={dStr}
                                                        onClick={() => { if (!isSunday) { if (scheduleIdx !== -1) setActiveDayIndex(scheduleIdx); else setStartDate(dStr); } }}
                                                        className={`aspect-square rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black transition-all duration-300 relative group/btn flex items-center justify-center
                                                            ${isSunday ? 'text-[var(--text-primary)] opacity-10 cursor-not-allowed' :
                                                                isActive ? 'bg-[var(--brand-primary)] text-white shadow-xl shadow-[var(--brand-primary)]/30 scale-105 sm:scale-110 z-10' :
                                                                    isPartOfSchedule ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-black hover:bg-[var(--brand-primary)]/20' :
                                                                        isStart ? 'bg-[var(--text-primary)] text-[var(--surface-main)] border-2 border-[var(--brand-primary)]' :
                                                                            'text-[var(--text-primary)] hover:bg-[var(--surface-main)] opacity-70'}`}
                                                    >
                                                        {day.getDate()}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-6 border-t border-[var(--border-default)]">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">Plan Scope</span>
                                            <span className="text-lg sm:text-xl font-black text-[var(--text-primary)]">{schedule.length} Days</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">Viewing</span>
                                            <span className="text-lg sm:text-xl font-black text-[var(--brand-primary)]">{months[navMonth].slice(0, 3)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Slot Editor (Right of Calendar) */}
                        <div className="xl:col-span-8 h-full">
                            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl h-full flex flex-col">
                                <div className="flex items-center justify-between mb-6 sm:mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--brand-primary)] text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20 shrink-0">
                                            <FiSettings className="text-lg sm:text-xl" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm sm:text-base md:text-lg font-black text-[var(--text-primary)] uppercase">Slot Editor</h2>
                                            <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">
                                                {activeDayData.date ? `${activeDayData.day}, ${new Date(activeDayData.date).getDate()} ${months[new Date(activeDayData.date).getMonth()]}` : 'Configuration'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSavePlan(activeDayIndex)}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-4 py-2 landscape:py-0.5 landscape:h-7 rounded-xl transition-all duration-300 font-bold text-[10px] sm:text-xs landscape:text-[9px] border border-emerald-500/20"
                                    >
                                        {isSaving ? <FiRefreshCcw className="animate-spin" /> : <FiCheck />}
                                        Update This Day
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-10 gap-y-6 sm:gap-y-8 flex-1">
                                    {mealTypes.map((type) => (
                                        <div key={type.id} className="group/item">
                                            <div className="flex justify-between items-center mb-2 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-${type.color}-500 text-xs sm:text-sm`}>{type.icon}</span>
                                                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{type.label}</span>
                                                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[var(--text-secondary)] opacity-30 ml-2">{type.time}</span>
                                                </div>
                                                {activeDayMeals.images?.[type.id] && (
                                                    <button onClick={() => removeImage(activeDayIndex, type.id)} className="text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"><FiTrash2 size={12} /></button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="relative shrink-0">
                                                    <div className="w-12 h-12 sm:w-14 md:w-16 sm:h-14 md:h-16 rounded-xl sm:rounded-[1.25rem] bg-[var(--surface-main)] border border-[var(--border-default)] overflow-hidden flex items-center justify-center transition-all group-hover/item:border-[var(--brand-primary)]/50">
                                                        {activeDayMeals.images?.[type.id] ? (
                                                            <img src={getImageUrl(activeDayMeals.images[type.id])} className="w-full h-full object-cover" alt="Meal" />
                                                        ) : (
                                                            <FiCamera className="text-[var(--text-secondary)] opacity-20 text-base sm:text-lg md:text-xl" />
                                                        )}
                                                    </div>
                                                    <label className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 md:w-7 sm:h-6 md:h-7 bg-[var(--surface-card)] text-[var(--brand-primary)] rounded-full border border-[var(--border-default)] flex items-center justify-center cursor-pointer hover:bg-[var(--brand-primary)] hover:text-white transition-all shadow-md">
                                                        <FiCamera size={10} className="sm:hidden" />
                                                        <FiCamera size={12} className="hidden sm:block" />
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(activeDayIndex, type.id, e.target.files[0])} />
                                                    </label>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={itemSearch[type.id] !== undefined ? itemSearch[type.id] : (items.find(it => it.id === activeDayMeals[type.id])?.name_en || activeDayMeals[type.id] || '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setItemSearch(prev => ({ ...prev, [type.id]: val }));
                                                            setShowDropdown(prev => ({ ...prev, [type.id]: true }));
                                                        }}
                                                        onFocus={() => setShowDropdown(prev => ({ ...prev, [type.id]: true }))}
                                                        className="w-full bg-[var(--surface-main)] border-none rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5 text-xs sm:text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all placeholder-[var(--text-secondary)]/30 shadow-inner"
                                                        placeholder={`Select ${type.label}...`}
                                                    />

                                                    {showDropdown[type.id] && (
                                                        <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-[50] max-h-64 overflow-hidden flex flex-col">
                                                            {/* Mini Category Filter */}
                                                            <div className="flex items-center justify-start gap-4 p-4 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--surface-main)] shrink-0 flex-nowrap no-scrollbar">
                                                                {categories.map(cat => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedCategory(cat);
                                                                        }}
                                                                        className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 border ${selectedCategory === cat
                                                                            ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20'
                                                                            : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--surface-main)]'}`}
                                                                    >
                                                                        {cat}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                                                {items
                                                                    .filter(item => {
                                                                        const search = (itemSearch[type.id] || '').toLowerCase();
                                                                        const matchesSearch = item.name_en?.toLowerCase().includes(search) || item.name?.toLowerCase().includes(search) || (item.id + '').includes(search);
                                                                        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
                                                                        return matchesSearch && matchesCat;
                                                                    })
                                                                    .slice(0, 20)
                                                                    .map(item => (
                                                                        <button
                                                                            key={item.id}
                                                                            onClick={() => {
                                                                                setMasterPlan(prev => {
                                                                                    const dStr = activeDayData.date;
                                                                                    const currentDay = prev[dStr] || { images: {} };
                                                                                    return {
                                                                                        ...prev,
                                                                                        [dStr]: {
                                                                                            ...currentDay,
                                                                                            [type.id]: item.id,
                                                                                            images: {
                                                                                                ...(currentDay.images || {}),
                                                                                                [type.id]: item.image_path // Auto-set image from product
                                                                                            }
                                                                                        }
                                                                                    };
                                                                                });
                                                                                setItemSearch(prev => ({ ...prev, [type.id]: item.name_en || item.name }));
                                                                                setShowDropdown(prev => ({ ...prev, [type.id]: false }));
                                                                            }}
                                                                            className="w-full text-left px-5 py-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors border-b border-[var(--border-default)] last:border-none flex items-center justify-between group/opt"
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span>{item.name_en || item.name}</span>
                                                                                <span className="text-[9px] opacity-40 uppercase tracking-widest font-black group-hover/opt:text-[var(--brand-primary)]">{item.category}</span>
                                                                            </div>
                                                                            <span className="text-[10px] opacity-40 font-black">₹{item.price}</span>
                                                                        </button>
                                                                    ))}
                                                                {items.length === 0 && (
                                                                    <div className="px-5 py-8 text-center text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">
                                                                        No items found
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Backdrop to close dropdown */}
                                                    {showDropdown[type.id] && (
                                                        <div
                                                            className="fixed inset-0 z-[40]"
                                                            onClick={() => setShowDropdown(prev => ({ ...prev, [type.id]: false }))}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 3. Timeline Table (Below both) */}
                        <div className="xl:col-span-12 space-y-8 mt-4">

                            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[2rem] sm:rounded-[3rem] shadow-2xl shadow-black/5 overflow-hidden flex flex-col min-h-[500px] sm:min-h-[600px] lg:min-h-[900px]">

                                <div className="p-5 sm:p-10 border-b border-[var(--border-default)] flex flex-row justify-between items-center bg-[var(--surface-main)]/50 gap-4">
                                    <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Meal Plan</h2>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 sm:px-4 py-2 rounded-xl text-[8px] sm:text-[10px] font-black uppercase">
                                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Active
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto bg-[var(--surface-card)] custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[1200px]">
                                        <thead className="sticky top-0 bg-[var(--surface-main)] backdrop-blur-xl z-20 border-b-2 border-[var(--brand-primary)]/20 shadow-sm">
                                            <tr className="bg-[var(--brand-primary)]/5">
                                                <th className="pl-6 sm:pl-10 pr-4 py-4 sm:py-6 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">Period</th>
                                                {mealTypes.map(t => (
                                                    <th key={t.id} className="px-4 py-4 sm:py-6 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">{t.label}</th>
                                                ))}
                                                <th className="pr-6 sm:pr-10 pl-4 py-4 sm:py-6 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Gallery</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-default)]/30">
                                            {schedule.map((dayPlan, idx) => (
                                                <tr key={idx} className="group hover:bg-[var(--surface-main)]/50 transition-all duration-300">
                                                    <td className="pl-6 sm:pl-10 pr-4 py-4 sm:py-8">
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--surface-main)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] font-black text-[10px] sm:text-sm group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all shadow-sm">
                                                                {dayPlan.dayNum}
                                                            </div>
                                                            <div>
                                                                <div className="text-[11px] sm:text-sm font-black text-[var(--text-primary)] whitespace-nowrap">{new Date(dayPlan.date).getDate()} {months[new Date(dayPlan.date).getMonth()]}</div>
                                                                <div className="text-[8px] sm:text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-tighter">{dayPlan.day}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {mealTypes.map(type => {
                                                        // Resolve display name: check if ID matches an item, or use the stored string (which might be name or ID)
                                                        const cellValue = dayPlan.meals?.[type.id];
                                                        const matchedItem = items.find(i => String(i.id) === String(cellValue));
                                                        const displayName = matchedItem ? matchedItem.name_en : cellValue;

                                                        return (
                                                            <td key={type.id} className="px-4 py-4 sm:py-8">
                                                                <div className="flex items-center gap-3">
                                                                    {dayPlan.meals?.images?.[type.id] && (
                                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden shadow-sm shrink-0 border border-[var(--border-default)] group-hover:scale-110 group-hover:rotate-3 transition-all">
                                                                            <img src={getImageUrl(dayPlan.meals.images[type.id])} className="w-full h-full object-cover" alt="Meal" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[8px] sm:text-[10px] font-bold text-[var(--text-secondary)] opacity-30 uppercase mb-0.5 tracking-tighter group-hover:text-[var(--brand-primary)]/50 transition-colors">{type.label}</span>
                                                                        <span className="text-[10px] sm:text-xs font-black text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
                                                                            {displayName || '-'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="pr-6 sm:pr-10 pl-4 py-4 sm:py-8">
                                                        <div className="flex -space-x-2 isolate group-hover:-space-x-1 transition-all duration-500">
                                                            {mealTypes.filter(t => dayPlan.meals?.images?.[t.id]).map((type, i) => (
                                                                <div key={type.id} className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg border-2 border-[var(--surface-card)] overflow-hidden shadow-2xl relative group/img transform hover:z-40 hover:-translate-y-2 hover:scale-125 transition-all cursor-zoom-in">
                                                                    <img src={getImageUrl(dayPlan.meals.images[type.id])} className="w-full h-full object-cover" alt="Meal" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-center p-0.5 sm:p-1">
                                                                        <span className="text-[6px] sm:text-[8px] text-white font-black uppercase tracking-tighter leading-tight">{type.label.slice(0, 3)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!dayPlan.meals || mealTypes.every(t => !dayPlan.meals.images?.[t.id])) && (
                                                                <span className="text-[8px] sm:text-[10px] font-bold text-[var(--text-secondary)] opacity-20 uppercase italic">No Visuals</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-6 sm:p-8 bg-[var(--surface-main)] border-t border-[var(--border-default)] text-center">
                                    <p className="text-[8px] sm:text-[10px] font-black text-[var(--text-secondary)] opacity-30 uppercase tracking-[0.3em]">End of Rotation Cycle</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default MealScheduler;
