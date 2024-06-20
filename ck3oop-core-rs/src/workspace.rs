use crate::mods::{ModList, ModLoadOrder};

/// Workspace is a main unit of the application.
/// Before you can work with mods, you need to create a workspace.
#[allow(dead_code)]
pub struct Workspace {
    /// Unique identifier of the workspace.
    id: String,
    /// Name of the workspace.
    name: String,
    /// Path to the game directory.
    /// (Steam/steamapps/common/Crusader Kings III).
    game_path: String,
    /// Path to the game data directory
    /// (documents/Paradox Interactive/Crusader Kings III).
    game_data_path: String,
    /// All mods available in the workspace.
    mod_list: ModList,
    /// Load order of the mods.
    mod_load_order: ModLoadOrder,
}
