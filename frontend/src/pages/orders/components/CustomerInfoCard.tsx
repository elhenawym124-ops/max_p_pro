import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    ArrowPathIcon,
    SparklesIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { OrderDetailsType, Government, Area } from '../types';
import { validateEgyptianPhone } from '../../../utils/validation';

interface CustomerInfoCardProps {
    order: OrderDetailsType;
    isEditing: boolean;
    editForm: any;
    setEditForm: (form: any) => void;
    governments: Government[];
    areas: Area[];
    loadingGovernments: boolean;
    loadingAreas: boolean;
    selectedGovernmentId: number | null;
    setSelectedGovernmentId: (id: number | null) => void;
    handleGovernmentChange: (id: number, name: string) => void;
    handleParseAddress: () => void;
    parsingAddress: boolean;
    parsedAddress: any;
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
    order,
    isEditing,
    editForm,
    setEditForm,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    selectedGovernmentId,
    setSelectedGovernmentId,
    handleGovernmentChange,
    handleParseAddress,
    parsingAddress,
    parsedAddress
}) => {
    const { t } = useTranslation();
    const [phoneErrors, setPhoneErrors] = useState<{ main?: string; alternative?: string }>({});

    const handlePhoneChange = (field: 'customerPhone' | 'alternativePhone', value: string) => {
        setEditForm({ ...editForm, [field]: value });

        if (value.trim() !== '') {
            const validation = validateEgyptianPhone(value);
            if (!validation.isValid) {
                setPhoneErrors(prev => ({ ...prev, [field === 'customerPhone' ? 'main' : 'alternative']: validation.error }));
            } else {
                setPhoneErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field === 'customerPhone' ? 'main' : 'alternative'];
                    return newErrors;
                });
            }
        } else {
            setPhoneErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field === 'customerPhone' ? 'main' : 'alternative'];
                return newErrors;
            });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" /> {t('orderDetails.customerInfo')}
                {order.customerRating && (
                    <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${order.customerRating === 'EXCELLENT' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
                        order.customerRating === 'GOOD' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                            order.customerRating === 'BAD' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                        {order.customerRating}
                    </span>
                )}
            </h3>
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.nameLabel')}</label>
                    {isEditing ? (
                        <input type="text" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100" />
                    ) : <p className="text-gray-900 dark:text-gray-100">{order.customerName || t('orders.notSpecified')}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.phoneLabel')}</label>
                    {isEditing ? (
                        <div>
                            <input
                                type="text"
                                value={editForm.customerPhone}
                                onChange={(e) => handlePhoneChange('customerPhone', e.target.value)}
                                className={`w-full rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${phoneErrors.main
                                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                dir="ltr"
                                placeholder="01xxxxxxxxx"
                            />
                            {phoneErrors.main && (
                                <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1">
                                    <ExclamationCircleIcon className="w-3 h-3" />
                                    <span>{phoneErrors.main}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center text-gray-900 dark:text-gray-100" dir="ltr">
                            <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" /> {order.customerPhone || t('orders.notSpecified')}
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.alternativePhone')}</label>
                    {isEditing ? (
                        <div>
                            <input
                                type="text"
                                value={editForm.alternativePhone}
                                onChange={(e) => handlePhoneChange('alternativePhone', e.target.value)}
                                className={`w-full rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${phoneErrors.alternative
                                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                dir="ltr"
                                placeholder={t('orderDetails.additionalPhone')}
                            />
                            {phoneErrors.alternative && (
                                <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1">
                                    <ExclamationCircleIcon className="w-3 h-3" />
                                    <span>{phoneErrors.alternative}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        order.alternativePhone ? (
                            <div className="flex items-center text-gray-900 dark:text-gray-100" dir="ltr">
                                <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" /> {order.alternativePhone}
                            </div>
                        ) : <p className="text-gray-400 dark:text-gray-500 text-sm">{t('orders.notSpecified')}</p>
                    )}
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.governorate')}</label>
                    {isEditing ? (
                        <select
                            value={editForm.governorate}
                            onChange={(e) => {
                                const selectedGov = governments.find(g => g.name === e.target.value);
                                if (selectedGov) {
                                    handleGovernmentChange(selectedGov.id, selectedGov.name);
                                } else {
                                    setEditForm({ ...editForm, governorate: e.target.value });
                                    setSelectedGovernmentId(null);
                                }
                            }}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
                            disabled={loadingGovernments}
                        >
                            <option value="">{t('orderDetails.selectGovernorate')}</option>
                            {governments.map((gov) => (
                                <option key={gov.id} value={gov.name}>
                                    {gov.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-gray-900 dark:text-gray-100">
                            {(() => {
                                const val = order.governorate || (order.shippingAddress as any)?.governorate;
                                if (!val) return t('orders.notSpecified');

                                // Check if it's a numeric ID
                                const govId = parseInt(String(val));
                                if (!isNaN(govId) && governments) {
                                    const found = governments.find(g => g.id === govId);
                                    if (found) return found.name;
                                }

                                // Clean numeric prefix if exists
                                return String(val).replace(/^\d+:/, '').trim();
                            })()}
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.areaCity')}</label>
                    {isEditing ? (
                        <select
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
                            disabled={loadingAreas || !selectedGovernmentId || areas.length === 0}
                        >
                            <option value="">
                                {loadingAreas
                                    ? t('orderDetails.loading')
                                    : !selectedGovernmentId
                                        ? t('orderDetails.selectGovernorateFirst')
                                        : areas.length === 0
                                            ? t('orderDetails.noAreasAvailable')
                                            : t('orderDetails.selectArea')}
                            </option>
                            {areas.map((area) => (
                                <option key={area.id} value={area.name}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-gray-900 dark:text-gray-100">
                            {order.city ? String(order.city).replace(/^\d+:/, '').trim() : t('orders.notSpecified')}
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('orderDetails.detailedAddress')}</label>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea value={editForm.customerAddress} onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })} className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" rows={3} placeholder={t('orderDetails.addressPlaceholder')} />
                            <button
                                onClick={handleParseAddress}
                                disabled={parsingAddress || !editForm.customerAddress}
                                className="flex items-center px-3 py-1.5 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 text-xs"
                            >
                                {parsingAddress ? (
                                    <>
                                        <ArrowPathIcon className="w-3 h-3 ml-1 animate-spin" />
                                        {t('orderDetails.parsing')}
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-3 h-3 ml-1" />
                                        {t('orderDetails.parseAddressAI')}
                                    </>
                                )}
                            </button>
                            {parsedAddress && (
                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    {t('orderDetails.parsedSuccess', { government: parsedAddress.government_name, area: parsedAddress.area_name || t('orders.notSpecified') })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start text-gray-900 dark:text-gray-100">
                            <MapPinIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2 mt-1" />
                            <span>{order.customerAddress || t('orders.notSpecified')}</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CustomerInfoCard;
