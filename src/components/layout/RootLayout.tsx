import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { CompanyProvider, useCompany } from '../../contexts/CompanyContext';
import { NotificationProvider, useNotification } from '../../contexts/NotificationContext';
import axiosInstance from '../../axiosInstance';
import { Cheque } from '../../types';

function AppLogic() {
    const { selectedCompany } = useCompany();
    const { setHasNearDueCheques } = useNotification();

    useEffect(() => {
        const fetchCheques = async () => {
            try {
                if (selectedCompany?.company_id) {
                    const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getChequesByCompanyId/${selectedCompany.company_id}`);
                    const fetchedCheques: Cheque[] = response.data;

                    // Check for near-due pending cheques
                    const hasNearDue = fetchedCheques.some((cheque) => {
                        if (cheque.cheque_date && cheque.status === 'pending') {
                            const today = new Date();
                            const chequeDate = new Date(cheque.cheque_date);
                            const diffInTime = chequeDate.getTime() - today.getTime();
                            const diffInDays = diffInTime / (1000 * 3600 * 24);
                            return diffInDays == 0 || diffInDays <= 3;
                        }
                        return false;
                    });
                    setHasNearDueCheques(hasNearDue);
                } else {
                    setHasNearDueCheques(false);
                }
            } catch (error) {
                console.error('Error fetching cheques for notification:', error);
                setHasNearDueCheques(false);
            }
        };

        fetchCheques();
    }, [selectedCompany, setHasNearDueCheques]);

    return <Outlet />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <CompanyProvider>
                <NotificationProvider>
                    <AppLogic />
                </NotificationProvider>
            </CompanyProvider>
        </AuthProvider>
    );
}
