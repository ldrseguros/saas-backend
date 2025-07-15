import { fetchDashboardStatistics } from "../services/dashboardService.js";

// @desc    Get dashboard statistics for Admin
// @route   GET /api/admin/dashboard/stats
// @access  Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const stats = await fetchDashboardStatistics(tenantId);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getDashboardStats controller:", error);
    res
      .status(error.statusCode || 500) // Use statusCode from service error if available
      .json({
        message: error.message || "Error fetching dashboard statistics",
        // Optionally, you might not want to expose originalError in production
        // error: error.originalError ? error.originalError.message : error.message
      });
  }
};
