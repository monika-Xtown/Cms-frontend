import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FiSave, FiArrowLeft, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout.jsx';
import api from '../../config/api.js';

const AddEmployee = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [fetchingAddress, setFetchingAddress] = useState(false);
    const [units, setUnits] = useState([]);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const validateField = (name, value) => {
        let error = "";
        if (name === 'personal_email') {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                error = "Invalid email format";
            }
        }
        if (name === 'residence_landline') {
            if (value && (!/^\d+$/.test(value) || value.length !== 10)) {
                error = "Contact No must be 10 digits";
            }
        }
        if (name === 'residence_postal_code') {
            if (value && (!/^\d+$/.test(value) || value.length !== 6)) {
                error = "Pin Code must be 6 digits";
            }
        }
        return error;
    };

    const [formData, setFormData] = useState({
        emp_code: '',
        first_name: '',
        last_name: '',
        personal_email: '',
        residence_landline: '',
        division_unit: '',
        address: '',
        residence_postal_code: '',
        password: '123'
    });

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const res = await api.get('/units');
                const unitsData = Array.isArray(res.data) ? res.data : (res.data?.units || []);
                setUnits(unitsData);
            } catch (err) {
                console.error("Error fetching units:", err);
            }
        };
        fetchUnits();

        if (user?.role === 'unit_admin' && user?.unit_id) {
            setFormData(prev => ({ ...prev, division_unit: String(user.unit_id) }));
        }
    }, [user]);

    const handlePincodeChange = async (pin) => {
        setFormData(prev => ({ ...prev, residence_postal_code: pin }));

        const error = validateField('residence_postal_code', pin);
        setErrors(prev => ({ ...prev, residence_postal_code: error }));

        if (!error && pin.length === 6) {
            setFetchingAddress(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await response.json();

                if (data[0].Status === "Success") {
                    const postOffices = data[0].PostOffice[0];
                    setFormData(prev => ({
                        ...prev,
                        address: `${postOffices.Name}, ${postOffices.District}, ${postOffices.State}`
                    }));
                }
            } catch (err) {
                console.error("Error fetching address details:", err);
            } finally {
                setFetchingAddress(false);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            alert("Please correct validation errors.");
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/employees/', formData);
            alert('Employee added successfully');
            navigate('/admin/employees');
        } catch (error) {
            console.error('Error adding employee:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            alert(error.response?.data?.error || error.response?.data?.message || 'Failed to add employee');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-slide-up opacity-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/employees')}
                            className="p-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                Add New Employee
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Enter employee details to register a new user
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-xl animate-fade-in relative overflow-hidden">
                    {/* Decorative blur */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">

                        {/* Basic Information */}
                        <div className="col-span-full border-b border-[var(--border-default)] pb-2 mb-2">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                                <FiCheckCircle className="text-[var(--brand-primary)]" /> Basic Information
                            </h3>
                        </div>

                        <InputField label="Employee Code" name="emp_code" value={formData.emp_code} onChange={handleChange} required placeholder="e.g. 10009" error={errors.emp_code} />
                        <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="e.g. Ms." error={errors.first_name} />
                        <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="e.g. Saranya Senthil" error={errors.last_name} />

                        <InputField label="Email" name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} placeholder="personal@example.com" error={errors.personal_email} />
                        <InputField label="Contact No" name="residence_landline" value={formData.residence_landline} onChange={handleChange} placeholder="10-digit mobile" maxLength={10} error={errors.residence_landline} />
                        <InputField label="Password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required placeholder="Default: 123" error={errors.password} showToggle onToggle={() => setShowPassword(!showPassword)} isVisible={showPassword} />

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Unit / Division</label>
                            <select
                                name="division_unit"
                                value={formData.division_unit}
                                onChange={handleChange}
                                disabled={user?.role === 'unit_admin'}
                                className={`w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none appearance-none ${user?.role === 'unit_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="">Select Unit</option>
                                {units.map(unit => (
                                    <option key={unit.id} value={unit.name || unit.code}>
                                        {unit.name} ({unit.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Address & Pincode Logic */}
                        <div className="space-y-1 relative">
                            <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Pin Code</label>
                            <input
                                type="text"
                                name="residence_postal_code"
                                value={formData.residence_postal_code}
                                onChange={(e) => handlePincodeChange(e.target.value)}
                                placeholder="6-digit Pin Code"
                                maxLength={6}
                                className={`w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 ${errors.residence_postal_code ? 'border-red-500' : 'border-[var(--border-default)]'} focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none`}
                            />
                            {fetchingAddress && (
                                <div className="absolute right-3 bottom-3">
                                    <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" size={14} />
                                </div>
                            )}
                            {errors.residence_postal_code && (
                                <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                                    <FiAlertCircle /> {errors.residence_postal_code}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <InputField label="Full Address" name="address" value={formData.address} onChange={handleChange} placeholder="Full address details" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 border-t border-[var(--border-default)] pt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/employees')}
                            className="px-8 py-4 rounded-2xl font-bold uppercase text-xs border-2 border-[var(--border-default)] hover:bg-[var(--surface-muted)] transition-all tracking-widest text-[var(--text-secondary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-4 rounded-2xl bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-bold uppercase text-xs shadow-lg shadow-[var(--brand-primary)]/20 hover:scale-[1.05] active:scale-95 transition-all tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiSave size={16} />
                            {submitting ? 'Saving...' : 'Save Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

const InputField = ({ label, name, type = "text", value, onChange, required, placeholder, maxLength, disabled, error, showToggle, onToggle, isVisible }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={disabled}
                className={`w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 ${error ? 'border-red-500' : 'border-[var(--border-default)]'} focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${showToggle ? 'pr-12' : ''}`}
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all p-1.5 flex items-center justify-center"
                >
                    {isVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
            )}
        </div>
        {error && (
            <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                <FiAlertCircle /> {error}
            </p>
        )}
    </div>
);

export default AddEmployee;
