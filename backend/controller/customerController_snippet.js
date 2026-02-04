
// تفاصيل العميل (info tab)
const getCustomerDetails = async (req, res) => {
    try {
        const { customerId } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const customer = await getSharedPrismaClient().customer.findUnique({
            where: { id: customerId },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'العميل غير موجود'
            });
        }

        if (customer.companyId !== companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول لهذا العميل'
            });
        }

        res.json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب بيانات العميل'
        });
    }
};
