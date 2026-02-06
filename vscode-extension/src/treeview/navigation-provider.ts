import * as vscode from "vscode";

interface NavItem {
  label: string;
  icon: string;
  route: string;
  command: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", route: "/", command: "clnode.openDashboard" },
  { label: "Agents", icon: "organization", route: "/agents", command: "clnode.openAgents" },
  { label: "Context", icon: "book", route: "/context", command: "clnode.openContext" },
  { label: "Tasks", icon: "checklist", route: "/tasks", command: "clnode.openTasks" },
  { label: "Activity", icon: "pulse", route: "/activity", command: "clnode.openActivity" },
];

export class NavTreeItem extends vscode.TreeItem {
  constructor(nav: NavItem) {
    super(nav.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(nav.icon);
    this.command = {
      command: nav.command,
      title: nav.label,
    };
  }
}

export class NavigationProvider implements vscode.TreeDataProvider<NavTreeItem> {
  getTreeItem(element: NavTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<NavTreeItem[]> {
    return NAV_ITEMS.map((nav) => new NavTreeItem(nav));
  }
}
