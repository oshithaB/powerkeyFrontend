import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, Plus, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ExpenseItem {
    category_id: number;
    category_name: string;
    description: string;
    amount: number;
}

interface Category {
    id: number;
    category_name: string;
}

interface PaymentAccount {
    id: number;
    payment_account_name: string;
    account_type_id: number;
    detail_type_id: number;
    description?: string;
}

interface PaymentMethod {
    id: number;
    name: string;
}

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, accountType?: string, detailType?: string, description?: string) => Promise<void>;
    existingMethods: string[];
    title: string;
    label: string;
}

interface Payee {
    id: number;
    name: string;
}

export default function EditExpense() {
    const { selectedCompany } = useCompany();
    const [categories, setCategories] = useState<Category[]>([]);
    const [payees, setPayees] = useState<Payee[]>([]);
    const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [paymentAccountFilter, setPaymentAccountFilter] = useState('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
    const [categorySuggestions, setCategorySuggestions] = useState<Category[]>([]);
    const [paymentAccountSuggestions, setPaymentAccountSuggestions] = useState<PaymentAccount[]>([]);
    const [paymentMethodSuggestions, setPaymentMethodSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const [payeeSuggestions, setPayeeSuggestions] = useState<Payee[]>([]);
    const [activePayeeSuggestion, setActivePayeeSuggestion] = useState<boolean>(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [isCreatePaymentAccountModalOpen, setIsCreatePaymentAccountModalOpen] = useState(false);
    const [isCreatePaymentMethodModalOpen, setIsCreatePaymentMethodModalOpen] = useState(false);
    const [isCreatePaymentAccountTypeModalOpen, setIsCreatePaymentAccountTypeModalOpen] = useState(false);
    const [isCreatePayeeModalOpen, setIsCreatePayeeModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { expense } = location.state || {};

    const initialFormData = {
        expense_number: expense ? expense.expense_number : `EXP-${Date.now()}`,
        // payment_account_id: expense ? expense.payment_account_id.toString() : '',
        payment_date: expense ? expense.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        payment_method: expense ? expense.payment_method_id.toString() : '',
        notes: expense ? expense.notes : '',
        payee_id: expense ? expense.payee_id : null,
        payee_name: expense ? expense.payee_name : '',
        status: expense ? expense.status : 'Unpaid',
    };

    const [formData, setFormData] = useState(initialFormData);

    const initialItems = [{
        category_id: 0,
        category_name: '',
        description: '',
        amount: 0,
    }];

    const [items, setItems] = useState<ExpenseItem[]>(expense?.items || initialItems);

    const fetchCategories = async () => {
        try {
        console.log('Fetching expense categories for company:', selectedCompany?.company_id);
        const response = await axiosInstance.get(`/api/getExpenseCategories/${selectedCompany?.company_id}`);
        setCategories(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to fetch categories');
        }
    };

    const fetchPaymentAccounts = async () => {
        try {
        const response = await axiosInstance.get(`/api/getPaymentAccounts/${selectedCompany?.company_id}`);
        setPaymentAccounts(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
        console.error('Error fetching payment accounts:', error);
        setError('Failed to fetch payment accounts');
        }
    };

    const fetchPaymentMethods = async () => {
        try {
        const response = await axiosInstance.get(`/api/getPaymentMethods`);
        console.log('Fetched payment methods:', response.data);
        setPaymentMethods(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
        console.error('Error fetching payment methods:', error);
        setError('Failed to fetch payment methods');
        setPaymentMethods([]);
        }
    };

    const fetchPayees = async () => {
        try {
        const response = await axiosInstance.get(`/api/getPayees/${selectedCompany?.company_id}`);
        setPayees(response.data);
        } catch (error) {
        console.error('Error fetching payees:', error);
        }
    };

    const handleCreateCategory = async (name: string) => {
        try {
        const response = await axiosInstance.post(`/api/addCategory/${selectedCompany?.company_id}`, {
            name,
        });
        const newCategory = response.data;
        setCategories((prev) => [...prev, newCategory]);
        setIsCreateCategoryModalOpen(false);
        alert('Category created successfully.');
        } catch (error) {
        console.error('Error creating category:', error);
        alert('Failed to create category.');
        }
    };

    const  handleCreatePaymentAccount = async (name: string, accountType?: string, detailType?: string, description?: string) => {
        try {
        const response = await axiosInstance.post(`/api/addPaymentAccount/${selectedCompany?.company_id}`, {
            name,
            account_type: accountType,
            detail_type: detailType,
            description,
        });
        const newAccount = response.data;
        setPaymentAccounts((prev) => [...prev, newAccount]);
        setPaymentAccountFilter(newAccount.name);
        setIsCreatePaymentAccountModalOpen(false);
        alert('Payment account created successfully.');
        navigate(0);
        } catch (error) {
        console.error('Error creating payment account:', error);
        alert('Failed to create payment account.');
        }
    };

    const handleCreatePaymentMethod = async (name: string) => {
        try {
        const response = await axiosInstance.post('/api/createPaymentMethod', {
            name,
        });
        const newMethod = response.data.name;
        setPaymentMethods((prev) => [...prev, newMethod]);
        setFormData({ ...formData, payment_method: newMethod });
        setIsCreatePaymentMethodModalOpen(false);
        alert('Payment method created successfully.');
        } catch (error) {
        console.error('Error creating payment method:', error);
        alert('Failed to create payment method.');
        }
    };

    const handleCreatePayeeMethod = async (name: string) => {
        try {
        const response = await axiosInstance.post('/api/addPayee', {
            name,
            company_id: selectedCompany?.company_id,
        });
        const newPayee = response.data.name;
        setPayees((prev) => [...prev, newPayee]);
        setFormData({ ...formData, payee_name: newPayee });
        setIsCreatePayeeModalOpen(false);
        alert('Payee created successfully.');
        } catch (error) {
        console.error('Error creating Payee:', error);
        alert('Failed to create Payee.');
        }
    };

    const handleCreatePaymentAccountType = async (accountType: string, details: string[]) => {
        try {
        await axiosInstance.post(`/api/addPaymentAccountType/${selectedCompany?.company_id}`, {
            account_type: accountType,
            details,
        });
        setIsCreatePaymentAccountTypeModalOpen(false);
        alert('Payment account type created successfully.');
        } catch (error) {
        console.error('Error creating payment account type:', error);
        alert('Failed to create payment account type.');
        }
    };

    useEffect(() => {
        if (selectedCompany) {
        fetchCategories();
        fetchPaymentAccounts();
        fetchPayees();
        fetchPaymentMethods();
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (expense) {
            setFormData({
                ...formData,
                payee_name: (() => {
                    const payeeObj = payees.find(p => p.id === expense.payee_id);
                    return payeeObj ? payeeObj.name || '' : '';
                })()
            });
        }
    }, [payees]);

    useEffect(() => {
        if (expense) {
            // Iterate through all expense items and add category_name from categories
            const updatedItems = (expense.items || []).map((item: ExpenseItem) => {
                const category = categories.find(c => c.id === item.category_id);
                return {
                    ...item,
                    category_name: category ? category.category_name : '',
                };
            });
            setItems(updatedItems.length > 0 ? updatedItems : initialItems);
        }
    }, [expense, categories]);

    useEffect(() => {
        if (activeSuggestionIndex !== null) {
        const activeItem = items[activeSuggestionIndex];
        if (activeItem?.category_name) {
            const filteredSuggestions = categories.filter(category =>
            category.category_name.toLowerCase().includes(activeItem.category_name.toLowerCase())
            );
            setCategorySuggestions(filteredSuggestions);
        } else {
            setCategorySuggestions(categories);
        }
        } else {
        setCategorySuggestions([]);
        }
    }, [items, categories, activeSuggestionIndex]);

    useEffect(() => {
        if (activePayeeSuggestion !== false) {
        const activePayee = formData.payee_name || '';
        if (activePayee) {
            const filteredPayees = payees.filter(payee =>
            payee.name.toLowerCase().includes(activePayee.toLowerCase())
            );
            setPayeeSuggestions(filteredPayees);
        } else {
            setPayeeSuggestions(payees);
        }
        } else {
        setPayeeSuggestions([]);
        }
    }, [formData.payee_name, payees, activePayeeSuggestion]);

    const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        if (field === 'category_id' && value) {
            const category = categories.find(c => c.id === parseInt(value));
            if (category) {
                updatedItems[index].category_name = category.category_name;
            }
        }

        if (field === 'amount') {
            const item = updatedItems[index];
            item.amount = Number((item.amount).toFixed(2));
        }

        setItems(updatedItems);
    };

    const addItem = () => {
        setItems([...items, {
        category_id: 0,
        category_name: '',
        description: '',
        amount: 0,
        }]);
        setCategorySuggestions(categories);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        const total = items
            .filter(item => item.category_id && item.category_id !== 0 && item.amount > 0)
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        return Number(total.toFixed(2));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
    
        try {
        if (!formData.expense_number) {
            throw new Error('Expense number is required');
        }
        if (!formData.payment_date) {
            throw new Error('Payment date is required');
        }
        
        // Filter out items with invalid category_id and validate
        const validItems = items.filter(item => item.category_id && item.category_id !== 0 && item.amount > 0);
        
        if (validItems.length === 0) {
            throw new Error('At least one item with a valid category and amount is required');
        }
    
        const total = calculateTotal();
    
        const submitData = {
            ...formData,
            company_id: selectedCompany?.company_id,
            // payment_account_id: parseInt(formData.payment_account_id) || null,
            total_amount: Number(total),
            items: validItems.map(item => ({
            category_id: item.category_id,
            category_name: item.category_name,
            description: item.description,
            amount: Number(item.amount), 
            })),
        };
        
        console.log('Submitting expense data:', submitData);
        
        if (expense) {
            console.log('Updating existing expense with ID:', expense.id);
            await axiosInstance.put(`/api/updateExpense/${selectedCompany?.company_id}/${expense.id}`, submitData);
        } else {
            await axiosInstance.post(`/api/createExpense/${selectedCompany?.company_id}`, submitData);
        }
    
        setFormData(initialFormData);
        setItems(initialItems);
        navigate("/dashboard/expenses");

        } catch (error: any) {
        console.error('Error saving expense:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to save expense';
        setError(errorMessage);
        alert(errorMessage);
        } finally {
        setLoading(false);
        }
    };

    const total = calculateTotal();

    //   payment method
    const CreatePaymentMethodModal: React.FC<CreateModalProps> = ({
        isOpen,
        onClose,
        onCreate,
        existingMethods,
        title,
        label,
    }) => {
        const [newName, setNewName] = useState('');
    
        const handleCreate = async () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            alert(`${label} name is required.`);
            return;
        }
        if (existingMethods.includes(trimmedName.toLowerCase())) {
            alert(`${label} already exists.`);
            return;
        }
        await onCreate(trimmedName);
        setNewName('');
        };
    
        if (!isOpen) return null;
    
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-6 w-6" />
                </button>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} Name *</label>
                <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full"
                placeholder={`Enter ${label.toLowerCase()} name`}
                maxLength={50}
                autoFocus
                required
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
                </button>
                <button type="button" onClick={handleCreate} className="btn btn-primary btn-md">
                Create
                </button>
            </div>
            </div>
        </div>
        );
    };

    const CreatePayeeModal: React.FC<CreateModalProps> = ({
        isOpen,
        onClose,
        onCreate,
        existingMethods,
        title,
        label,
    }) => {
        const [newName, setNewName] = useState('');
    
        const handleCreate = async () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            alert(`${label} name is required.`);
            return;
        }
        if (existingMethods.includes(trimmedName.toLowerCase())) {
            alert(`${label} already exists.`);
            return;
        }
        await onCreate(trimmedName);
        setNewName('');
        };
    
        if (!isOpen) return null;
    
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-6 w-6" />
                </button>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} Name *</label>
                <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full"
                placeholder={`Enter ${label.toLowerCase()} name`}
                maxLength={50}
                autoFocus
                required
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
                </button>
                <button type="button" onClick={handleCreate} className="btn btn-primary btn-md">
                Create
                </button>
            </div>
            </div>
        </div>
        );
    };

    // Category modal
    const CreateCategoryModal: React.FC<{
        isOpen: boolean;
        onClose: () => void;
        onCreate: (name: string) => Promise<void>;
        existingMethods: string[];
    }> = ({ isOpen, onClose, onCreate, existingMethods }) => {
        const [newName, setNewName] = useState('');
    
        const handleCreate = async () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            alert('Category name is required.');
            return;
        }
        if (existingMethods.includes(trimmedName.toLowerCase())) {
            alert('Category already exists.');
            return;
        }
        await onCreate(trimmedName);
        setNewName('');
        };
    
        if (!isOpen) return null;
    
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create New Category</h2>
                <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-6 w-6" />
                </button>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full"
                placeholder="Enter category name"
                maxLength={50}
                autoFocus
                required
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
                </button>
                <button type="button" onClick={handleCreate} className="btn btn-primary btn-md">
                Create
                </button>
            </div>
            </div>
        </div>
        );
    };

    // payment account modal
    const CreatePaymentAccountModal: React.FC<CreateModalProps> = ({isOpen, onClose, onCreate, existingMethods, title, label}) => {
        const [newName, setNewName] = useState('');
        const [accountType, setAccountType] = useState('');
        const [detailType, setDetailType] = useState('');
        const [description, setDescription] = useState('');
        const [accountTypes, setAccountTypes] = useState<string[]>([]);
        const [detailTypes, setDetailTypes] = useState<string[]>([]);

        useEffect(() => {
        const fetchAccountTypes = async () => {
            try {
            const response = await axiosInstance.get(`/api/getPaymentAccountTypes/${selectedCompany?.company_id}`);
            setAccountTypes(response.data);
            } catch (error) {
            console.error('Error fetching account types:', error);
            }
        };
        fetchAccountTypes();
        }, [selectedCompany]);

    
        const handleCreate = async () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            alert(`${label} name is required.`);
            return;
        }
        if (existingMethods.includes(trimmedName.toLowerCase())) {
            alert(`${label} already exists.`);
            return;
        }
        await onCreate(trimmedName, accountType || undefined, detailType || undefined, description || undefined);
        setNewName('');
        setAccountType('');
        setDetailType('');
        setDescription('');
        };

        const fetchDetailTypes = async(id: string) => {
        try {
            const detailTypes = await axiosInstance.get(`/api/getPaymentAccountTypeDetails/${id}`);
            setDetailTypes(detailTypes.data || []);
        } catch (error) {
            console.error('Error fetching detail types:', error);
        }
        };
    
        if (!isOpen) return null;
    
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-6 w-6" />
                </button>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} Name *</label>
                <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full"
                placeholder={`Enter ${label.toLowerCase()} name`}
                maxLength={50}
                autoFocus
                required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                <select
                value={accountType}
                onChange={(e) => {
                    if (e.target.value === 'create_new') {
                    setIsCreatePaymentAccountTypeModalOpen(true);
                    setIsCreatePaymentAccountModalOpen(false);
                    } else {
                    setAccountType(e.target.value);
                    fetchDetailTypes(e.target.value);
                    }
                }}
                className="input w-full"
                required
                >
                <option value="" disabled>Select Account Type</option>
                <option value="create_new">+ Create New Payment Account Type</option>
                {accountTypes.map((type: any, index: number) => (
                    <option key={index} value={type.id}>
                    {type.account_type_name}
                    </option>
                ))}
                </select>
            </div>

                <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Detail Type *</label>
                <select
                value={detailType}
                onChange={(e) => setDetailType(e.target.value)}
                className="input w-full"
                required
                disabled={!accountType}
                >
                <option value="" disabled>Select Detail Type</option>
                {detailTypes.map((type: any, index: number) => (
                    <option key={index} value={type.id}>
                    {type.detail_type_name}
                    </option>
                ))}
                </select>
                </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full min-h-[80px]"
                placeholder="Enter category description"
                maxLength={200}
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
                </button>
                <button type="button" onClick={handleCreate} className="btn btn-primary btn-md">
                Create
                </button>
            </div>
            </div>
        </div>
        );
    };

    const PaymentAccountTypeModal: React.FC<{isOpen: boolean; onClose: () => void; onSave: (accountType: string, details: string[]) => Promise<void>;}> = ({ isOpen, onClose, onSave }) => {

        const [accountType, setAccountType] = useState('');
        const [items, setItems] = useState<string[]>([]);
        const [newItem, setNewItem] = useState('');

        const addItem = () => {
        if (!newItem.trim()) return;
        setItems([...items, newItem.trim()]);
        setNewItem('');
        };

        const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
        };

        const handleSave = async () => {
        if (!accountType.trim()) {
            alert('Account type name is required.');
            return;
        }
        await onSave(accountType, items);
        setAccountType('');
        setItems([]);
        onClose();
        };

        if (!isOpen) return null;

        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create Payment Account Type</h2>
                <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-6 w-6" />
                </button>
            </div>

            {/* Account Type Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type Name *</label>
                <input
                type="text"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="input w-full"
                placeholder="Enter account type name"
                maxLength={50}
                required
                />
            </div>

            {/* Items Header + Add Button */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Detail Types *</label>
                <div className="flex justify-between items-center mb-2">
                <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="input mr-2 flex-1"
                placeholder="Enter detail type"
                maxLength={50}
                />
                <button
                type="button"
                onClick={addItem}
                className="btn btn-secondary btn-sm flex items-center"
                style={{ width: 'auto' }}
                >
                <Plus className="h-4 w-4 mr-1" />
                Add
                </button>
                </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    style={{ width: '90%' }}
                    >
                    Detail Type
                    </th>
                    <th
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    style={{ width: '10%' }}
                    >
                    Action
                    </th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index} className="border-t">
                    <td className="px-4 py-2" style={{ width: '90%' }}>{item}</td>
                    <td className="px-4 py-2" style={{ width: '10%' }}>
                    <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-900"
                    >
                    <Trash2 className="h-4 w-4" />
                    </button>
                    </td>
                    </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-400 uppercase text-sm">
                    No detail types added
                    </td>
                    </tr>
                )}
                </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
                </button>
                <button type="button" onClick={handleSave} className="btn btn-primary btn-md">
                Save
                </button>
            </div>
            </div>
        </div>
        );
    };


  return ( 
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Expense
            </h3>
            <button
              onClick={() => navigate("/dashboard/expenses")}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Number *
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.expense_number}
                  onChange={(e) => setFormData({ ...formData, expense_number: e.target.value })}
                  placeholder="Enter expense number"
                  disabled
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payee *
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.payee_name || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, payee_name: e.target.value })
                    setActivePayeeSuggestion(true);
                  }}
                  onFocus={() => {
                    setActivePayeeSuggestion(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setActivePayeeSuggestion(false);
                      setPayeeSuggestions([]);
                    }, 200);
                  }}
                  placeholder="Enter payee name"
                  required
                />
                {activePayeeSuggestion && (
                  <ul
                    className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1"
                    style={{
                      maxHeight: '240px',
                      maxWidth: '420px',
                      minWidth: '220px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      width: '420px',
                    }}
                  >
                    <li
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t"
                      onMouseDown={() => {
                        setIsCreatePayeeModalOpen(true);
                        setCategorySuggestions([]);
                        setActiveSuggestionIndex(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Payee
                    </li>
                    {payeeSuggestions.map((payee, index) => (
                      <li
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onMouseDown={() => {
                          setFormData({ ...formData, payee_name: payee.name , payee_id: payee.id.toString() });
                          setPayeeSuggestions([]);
                          setActivePayeeSuggestion(false);
                        }}
                      >
                        <span>{payee.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

                {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                    </label>
                    <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={(e) => {
                        if (e.target.value === 'create_new') {
                            setIsCreateCategoryModalOpen(true);
                        } else {
                            setFormData({ ...formData, category_id: e.target.value });
                        }
                        }}
                        className="input w-full"
                        required
                    >
                        <option value="" disabled>
                        Select Category
                        </option>
                        <option value="create_new">+ Create New Category</option>
                        {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                        ))}
                    </select>
                </div> */}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                    </label>
                    <input
                        type="date"
                        className="input"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method *
                    </label>
                    <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={(e) => {
                        if (e.target.value === 'create_new') {
                            setIsCreatePaymentMethodModalOpen(true);
                        } else {
                            setFormData({ ...formData, payment_method: e.target.value });
                        }
                        }}
                        className="input w-full"
                        required
                    >
                        <option value="" disabled>
                        Select Payment Method
                        </option>
                        <option value="create_new">+ Create New Payment Method</option>
                        {paymentMethods.map((method, index) => (
                        <option key={index} value={method.id}>
                            {method.name}
                        </option>
                        ))}
                    </select>
                </div>


                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                    </label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={(e) => {
                            setFormData({ ...formData, status: e.target.value });
                        }}
                        className="input w-full"
                        required
                    >
                        <option value="unpaid">
                        Unpaid
                        </option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th> */}
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.category_name || ''}
                            onChange={(e) => {
                              updateItem(index, 'category_name', e.target.value);
                              setActiveSuggestionIndex(index);
                            }}
                            onFocus={() => {
                              setActiveSuggestionIndex(index);
                              const filtered = categories.filter(category =>
                                category.category_name.toLowerCase().includes(item.category_name?.toLowerCase() || '')
                              );
                              setCategorySuggestions(filtered.length > 0 ? filtered : categories);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                if (activeSuggestionIndex === index) {
                                  setCategorySuggestions([]);
                                  setActiveSuggestionIndex(null);
                                }
                              }, 200);
                            }}
                            placeholder="Search Category"
                            className="border rounded px-2 py-1 w-full"
                          />
                          {activeSuggestionIndex === index && (
                            <ul
                              className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1"
                              style={{
                                maxHeight: '240px',
                                maxWidth: '420px',
                                minWidth: '220px',
                                overflowY: 'auto',
                                overflowX: 'auto',
                                width: '420px',
                              }}
                            >
                              <li
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t"
                                onMouseDown={() => {
                                  setIsCreateCategoryModalOpen(true);
                                  setCategorySuggestions([]);
                                  setActiveSuggestionIndex(null);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Category
                              </li>
                              {categorySuggestions.map(category => (
                                <li
                                  key={category.id}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                  onMouseDown={() => {
                                    const updatedItems = [...items];
                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      category_id: category.id,
                                      category_name: category.category_name,
                                    };
                                    setItems(updatedItems);
                                    setCategorySuggestions([]);
                                    setActiveSuggestionIndex(null);
                                  }}
                                >
                                  <span>{category.category_name}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="input"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Description"
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input w-34"
                            value={item.amount}
                            onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="input min-h-[80px]"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>Rs. {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard/expenses")}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-md"
              >
                {loading ? 'Saving...' : expense ? 'Update Expense' : 'Create Expense'}
              </button>
            </div>
          </form>

          <CreateCategoryModal
            isOpen={isCreateCategoryModalOpen}
            onClose={() => setIsCreateCategoryModalOpen(false)}
            onCreate={handleCreateCategory}
            existingMethods={categories
              .filter(c => c && c.category_name) // Add null check
              .map(c => c.category_name.toLowerCase())
            }
          />
            <CreatePaymentAccountModal
            isOpen={isCreatePaymentAccountModalOpen}
            onClose={() => setIsCreatePaymentAccountModalOpen(false)}
            onCreate={handleCreatePaymentAccount}
            existingMethods={paymentAccounts
              .filter(a => a && a.payment_account_name) // only keep objects with a valid name
              .map(a => a.payment_account_name.toLowerCase())
            }
            title="Create New Payment Account"
            label="Payment Account"
          />
            <CreatePaymentMethodModal
            isOpen={isCreatePaymentMethodModalOpen}
            onClose={() => setIsCreatePaymentMethodModalOpen(false)}
            onCreate={handleCreatePaymentMethod}
            existingMethods={paymentMethods
              .filter(m => m && m.name) // only keep objects with a valid name
              .map(m => m.name.toLowerCase())
            }
            title="Create New Payment Method"
            label="Payment Method"
          />

          <CreatePayeeModal
            isOpen={isCreatePayeeModalOpen}
            onClose={() => setIsCreatePayeeModalOpen(false)}
            onCreate={handleCreatePayeeMethod}
            existingMethods={payees
              .filter(p => p && p.name) // only keep objects with a valid name
              .map(p => p.name.toLowerCase())
            }
            title="Create New Payee"
            label="Payee"
          />

          <PaymentAccountTypeModal
            isOpen={isCreatePaymentAccountTypeModalOpen}
            onClose={() => {
              setIsCreatePaymentAccountTypeModalOpen(false);
              setIsCreatePaymentAccountModalOpen(true);
            }}
            onSave={handleCreatePaymentAccountType}
          />


        </div>
      </div>
    </motion.div>
  );
}