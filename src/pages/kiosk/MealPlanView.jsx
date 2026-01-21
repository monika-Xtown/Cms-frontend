import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../../config/api.js";
import Layout from "../../components/Layout.jsx";
import { FiChevronLeft, FiImage, FiPackage } from "react-icons/fi";

const MealPlanView = () => {
    const navigate = useNavigate();
    const [mealPlan, setMealPlan] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMealPlan = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1; // 1-based for API

            const res = await api.get(`/menu/month?year=${year}&month=${month}`);

            // Handle both wrapped response ({ success: true, plan: [...] }) and raw array response ([...])
            let planData = [];
            if (Array.isArray(res.data)) {
                planData = res.data;
            } else {
                planData = res.data.plans || res.data.plan || [];
            }

            if ((planData.length > 0) || (res.data && res.data.success)) {
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const schedule = [];

                // Sort by ID or Date to ensure order
                // The new data structure has explicit Date fields, so we can just map directly if it's the 30-day list
                // Helper to resolve image URL
                const getImageUrl = (path) => {
                    if (!path) return null;
                    if (path.startsWith('http') || path.startsWith('blob:')) return path;
                    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
                };

                // Check for new flat structure (Array of objects with date, meal_type, item/item_id)
                // Use robust check for 'meal_type'
                const isRowPerMeal = planData.some(p => p.meal_type && (p.item || p.item_id));

                if (isRowPerMeal) {
                    // Group by Date and build schedule
                    const grouped = {};
                    planData.forEach(p => {
                        const dateKey = p.date;
                        if (!dateKey) return;
                        if (!grouped[dateKey]) {
                            grouped[dateKey] = { dateStr: dateKey, items: [] };
                        }
                        grouped[dateKey].items.push(p);
                    });

                    const sortedKeys = Object.keys(grouped).sort();

                    sortedKeys.forEach(k => {
                        const group = grouped[k];
                        const d = new Date(group.dateStr);
                        if (isNaN(d.getTime())) return;

                        const dayItems = group.items;

                        const getItemsForType = (type) => dayItems.filter(i => (i.meal_type || "").toLowerCase() === type.toLowerCase());

                        const getNames = (items) => {
                            if (!items || items.length === 0) return 'N/A';
                            return items.map(i => i.item?.name_en || i.item?.name_ta || "Unknown").join(", ");
                        };

                        const getImage = (items) => {
                            const itemWithImage = items.find(i => i.item?.image_path || i.item?.image);
                            const path = itemWithImage?.item?.image_path || itemWithImage?.item?.image;
                            return getImageUrl(path);
                        };

                        // Snacks splitting logic
                        const snacks = getItemsForType('Snack');
                        const otherSnacks = dayItems.filter(i => {
                            const t = (i.meal_type || "").toLowerCase();
                            return t.includes('snack') && t !== 'snack';
                        });

                        const combinedSnacks = [...snacks, ...otherSnacks];
                        // Sort by ID to stabilize
                        combinedSnacks.sort((a, b) => a.id - b.id);

                        let midDaySnacks = [];
                        let eveningSnacks = [];

                        if (combinedSnacks.length === 1) {
                            midDaySnacks = [combinedSnacks[0]];
                        } else if (combinedSnacks.length >= 2) {
                            midDaySnacks = [combinedSnacks[0]];
                            eveningSnacks = combinedSnacks.slice(1);
                        }

                        const breakfastItems = getItemsForType('Breakfast');
                        const lunchItems = getItemsForType('Lunch');
                        const dinnerItems = getItemsForType('Dinner');

                        schedule.push({
                            dayNum: d.getDate(),
                            dateStr: `${d.getDate()} ${months[d.getMonth()]}`,
                            dayName: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
                            breakfast: getNames(breakfastItems),
                            snack1: getNames(midDaySnacks),
                            lunch: getNames(lunchItems),
                            snack2: getNames(eveningSnacks),
                            dinner: getNames(dinnerItems),
                            images: {
                                breakfast: getImage(breakfastItems),
                                snack1: getImage(midDaySnacks),
                                lunch: getImage(lunchItems),
                                snack2: getImage(eveningSnacks),
                                dinner: getImage(dinnerItems)
                            }
                        });
                    });

                } else {
                    // Fallback to "Fat" Structure (Row per Day)
                    // Check if we have explicit Date fields
                    const isFatStructure = planData.some(p => p.Date || p.date);

                    if (isFatStructure) {
                        planData.sort((a, b) => new Date(a.Date || a.date) - new Date(b.Date || b.date));
                        planData.forEach((p) => {
                            const d = new Date(p.Date || p.date);
                            if (isNaN(d.getTime())) return;

                            schedule.push({
                                dayNum: d.getDate(),
                                dateStr: `${d.getDate()} ${months[d.getMonth()]}`,
                                dayName: (p.Day || p.day || d.toLocaleDateString('en-US', { weekday: 'long' })).toUpperCase(),
                                breakfast: p.Breakfast || p.breakfast || 'N/A',
                                snack1: p.Snack1 || p.snack1 || 'N/A',
                                lunch: p.Lunch || p.lunch || 'N/A',
                                snack2: p.Snack2 || p.snack2 || 'N/A',
                                dinner: p.Dinner || p.dinner || 'N/A',
                                images: {
                                    breakfast: getImageUrl(p.Breakfast_Image || p.Breakfast_image || p.breakfast_image),
                                    snack1: getImageUrl(p.Snack1_Image || p.Snack1_image || p.snack1_image),
                                    lunch: getImageUrl(p.Lunch_Image || p.Lunch_image || p.lunch_image),
                                    snack2: getImageUrl(p.Snack2_Image || p.Snack2_image || p.snack2_image),
                                    dinner: getImageUrl(p.Dinner_Image || p.Dinner_image || p.dinner_image)
                                }
                            });
                        });
                    }
                }

                setMealPlan(schedule);
            }
        } catch (err) {
            console.error("Error fetching meal plan:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMealPlan();
    }, []);

    const mealTypes = [
        { id: 'breakfast', label: 'Breakfast', color: 'amber' },
        { id: 'snack1', label: 'Mid-Day Snack', color: 'emerald' },
        { id: 'lunch', label: 'Lunch', color: 'orange' },
        { id: 'snack2', label: 'Evening Snack', color: 'blue' },
        { id: 'dinner', label: 'Dinner', color: 'indigo' }
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-[var(--surface-main)] flex flex-col no-scrollbar overflow-y-auto">
                <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-default)] pb-6 sticky top-0 bg-[var(--surface-main)]/80 backdrop-blur-md z-[100] no-scrollbar">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all shadow-sm"
                            >
                                <FiChevronLeft size={40} />
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                                    <div className="w-1 h-6 sm:w-1.5 sm:h-8 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(250,198,57,0.3)]" />
                                    Meal Plan
                                </h1>
                                <p className="text-[9px] sm:text-xs font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mt-0.5 ml-3 sm:ml-4">
                                    30-Day Food Schedule
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[60vh] flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : mealPlan.length === 0 ? (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-[var(--text-secondary)] gap-4 opacity-30">
                            <FiPackage size={64} />
                            <p className="text-xl font-bold uppercase tracking-widest">No meal plan published yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {/* MOBILE NAVIGATION PILLS */}
                            <div className="lg:hidden sticky top-[80px] z-[90] bg-[var(--surface-main)]/90 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-[var(--border-default)]">
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 no-scrollbar">
                                    {mealPlan.map((day) => (
                                        <button
                                            key={day.dayNum}
                                            onClick={() => document.getElementById(`day-${day.dayNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                            className="flex-shrink-0 px-4 py-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] active:bg-[var(--brand-primary)] active:text-white active:border-[var(--brand-primary)] shadow-sm transition-all whitespace-nowrap"
                                        >
                                            Day {day.dayNum}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* TABLE VIEW (Desktop/Laptop) */}
                            <div className="hidden lg:block rounded-[2.5rem] border border-[var(--border-default)] overflow-hidden bg-[var(--surface-card)] shadow-2xl shadow-black/5">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[1200px]">
                                        <thead className="sticky top-0 bg-[var(--surface-main)] backdrop-blur-xl z-20 border-b-2 border-[var(--brand-primary)]/20 shadow-sm">
                                            <tr>
                                                <th className="pl-10 pr-6 py-8 text-[11px] font-black uppercase tracking-widest text-[var(--brand-primary)]">Schedule</th>
                                                {mealTypes.map(t => (
                                                    <th key={t.id} className="px-6 py-8 text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">{t.label}</th>
                                                ))}
                                                <th className="pr-10 pl-6 py-8 text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">Gallery</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-default)]/30">
                                            {mealPlan.map((day, idx) => (
                                                <tr key={idx} className="group hover:bg-[var(--brand-primary)]/[0.02] transition-all duration-300">
                                                    <td className="pl-10 pr-6 py-10">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-main)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] font-black text-lg group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all shadow-md group-hover:scale-105 shrink-0">
                                                                {day.dayNum}
                                                            </div>
                                                            <div className="min-w-[120px]">
                                                                <div className="text-base font-black text-[var(--text-primary)] leading-tight">{day.dateStr}</div>
                                                                <div className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mt-0.5">{day.dayName}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {mealTypes.map(type => (
                                                        <td key={type.id} className="px-6 py-10">
                                                            <div className="flex items-center gap-4">
                                                                {day.images?.[type.id] ? (
                                                                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shrink-0 border border-[var(--border-default)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                                        <img src={day.images[type.id]} className="w-full h-full object-cover" alt="Meal" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-main)] border border-[var(--border-default)] flex items-center justify-center shrink-0 opacity-20">
                                                                        <FiImage size={24} />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={`text-[9px] font-black uppercase mb-1 tracking-tighter group-hover:opacity-100 opacity-40 transition-opacity text-${type.color}-500`}>{type.label}</span>
                                                                    <span className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[150px]">{day[type.id] || '-'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td className="pr-10 pl-6 py-10">
                                                        <div className="flex -space-x-4 isolate group-hover:-space-x-2 transition-all duration-500">
                                                            {mealTypes.filter(t => day.images?.[t.id]).map((type, i) => (
                                                                <div key={type.id} className="w-12 h-12 rounded-2xl border-4 border-[var(--surface-card)] overflow-hidden shadow-xl relative group/img transform hover:z-40 hover:-translate-y-2 hover:scale-150 transition-all cursor-zoom-in">
                                                                    <img src={day.images[type.id]} className="w-full h-full object-cover" alt="Meal" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* FLEXIBLE MOBILE/TABLET VIEW (Cards + Grid) */}
                            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
                                {mealPlan.map((day, idx) => (
                                    <div
                                        key={idx}
                                        id={`day-${day.dayNum}`}
                                        className="bg-[var(--surface-card)] rounded-[2.5rem] border border-[var(--border-default)] p-6 space-y-6 shadow-xl shadow-black/[0.03] active:scale-[0.99] transition-all scroll-mt-32"
                                    >
                                        <div className="flex items-center justify-between border-b border-[var(--border-default)]/50 pb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <span className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center text-xl font-black shadow-[0_8px_20px_rgba(250,198,57,0.3)]">
                                                        {day.dayNum}
                                                    </span>
                                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--surface-main)] border border-[var(--border-default)] flex items-center justify-center">
                                                        <FiPackage size={12} className="text-[var(--brand-primary)]" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-[var(--text-primary)] text-lg tracking-tight uppercase leading-none mb-1">{day.dateStr}</h3>
                                                    <p className="text-[11px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.2em]">{day.dayName}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {mealTypes.map((type) => (
                                                <div key={type.id} className="group relative flex items-center gap-4 bg-[var(--surface-main)] p-3 rounded-[1.5rem] border border-[var(--border-default)]/30 hover:border-[var(--brand-primary)]/40 transition-all overflow-hidden">
                                                    {/* Background Glow */}
                                                    <div className={`absolute inset-0 bg-${type.color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />

                                                    {day.images?.[type.id] ? (
                                                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[var(--border-default)]/50 shadow-lg group-hover:scale-105 transition-transform duration-500">
                                                            <img src={day.images[type.id]} className="w-full h-full object-cover" alt={type.label} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-xl bg-[var(--surface-card)] flex items-center justify-center shrink-0 border border-[var(--border-default)]/50">
                                                            <FiImage className="text-[var(--text-secondary)] opacity-10" size={24} />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0 relative z-10">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest text-${type.color}-500/80 mb-0.5 block`}>
                                                            {type.label}
                                                        </span>
                                                        <span className="text-[14px] font-black text-[var(--text-primary)] leading-snug group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">
                                                            {day[type.id] || 'Not Scheduled'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-10 pb-20 text-center border-t border-[var(--border-default)]">
                        <p className="text-xs font-black text-[var(--text-secondary)] opacity-20 uppercase tracking-[0.5em]">
                            End of 30-Day Rotation Cycle
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MealPlanView;
