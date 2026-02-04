/**
 * 🚀 Bulk Update AI Engine for All Companies
 * Updates useModernAgent flag for all companies' AI settings
 */
const bulkUpdateAIEngine = async (req, res) => {
    try {
        const { useModernAgent } = req.body;

        if (useModernAgent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'useModernAgent parameter is required'
            });
        }

        console.log(`🔄 [BULK-AI-ENGINE] Updating all companies to: ${useModernAgent ? 'Modern' : 'Legacy'}`);

        // Get all companies
        const companies = await getSharedPrismaClient().company.findMany({
            select: { id: true }
        });

        let updatedCount = 0;

        // Update each company's AI settings
        for (const company of companies) {
            try {
                await getSharedPrismaClient().aiSettings.upsert({
                    where: { companyId: company.id },
                    create: {
                        companyId: company.id,
                        useModernAgent
                    },
                    update: {
                        useModernAgent
                    }
                });
                updatedCount++;
            } catch (err) {
                console.error(`❌ Failed to update company ${company.id}:`, err.message);
            }
        }

        console.log(`✅ [BULK-AI-ENGINE] Updated ${updatedCount}/${companies.length} companies`);

        res.json({
            success: true,
            message: `تم تحديث ${updatedCount} شركة بنجاح`,
            updatedCount,
            totalCompanies: companies.length,
            engine: useModernAgent ? 'Modern (2026)' : 'Legacy (2023)'
        });

    } catch (error) {
        console.error('❌ Error in bulk AI engine update:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعدادات الذكاء الاصطناعي',
            error: error.message
        });
    }
};

module.exports = {
    getCurrentCompany,
    REMOVEDDangerousFallbackEndpoint,
    companyUsageEndpoint,
    mockEndpoint,
    companyPlansEndpoint,
    getCompanyInfoEndpoint,
    safeUsageEndpoint,
    updateCompanyCurrency,
    getAllCompanies,
    getCompanyDetails,
    createNewCompany,
    updateCompany,
    deleteCompany,
    getCompanyUsers,
    createnewUserForCompany,
    updateUser,
    updateMyProfile,
    deleteUser,
    createCustomRole,
    getCompanyRoles,
    updateCustomRole,
    deleteCustomRole,
    sendUserInvitation,
    getCompanyInvitations,
    cancelInvitation,
    resendInvitation,
    FrontendSpecificSafeEndpoint,
    updateCompanySlug,
    checkSlugAvailability,
    getUsersStatistics,
    uploadCompanyLogo,
    bulkUpdateAIEngine
}
