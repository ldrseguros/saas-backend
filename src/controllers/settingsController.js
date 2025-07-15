import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/settingsService.js";

// @desc    Obter todas as configurações do sistema
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    res
      .status(500)
      .json({
        message: "Erro ao buscar configurações do sistema",
        error: error.message,
      });
  }
};

// @desc    Atualizar configurações do sistema
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    const updatedSettings = await updateSystemSettings(req.body);
    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    res
      .status(500)
      .json({
        message: "Erro ao atualizar configurações do sistema",
        error: error.message,
      });
  }
};
