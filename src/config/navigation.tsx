import {
	BookText,
	Boxes,
	BrickWallFire,
	ClockFading,
	Code,
	DatabaseBackup,
	Earth,
	FolderSync,
	LayoutGrid,
	Lightbulb,
	LogIn,
	Mail,
	ShieldCheck,
	SquareActivity,
	Store,
	UserLock,
} from "lucide-react";
import type React from "react";
import {
	LuBox,
	LuCloudUpload,
	LuDatabase,
	LuFileText,
	LuGitlab,
	LuLockKeyhole,
	LuNetwork,
	LuServer,
	LuSettings,
	LuTvMinimalPlay,
	LuWaypoints,
} from "react-icons/lu";
import { TbCloudComputing, TbSmartHome } from "react-icons/tb";
import SvgAnsible from "@/icons/Ansible";

interface INavItemBase {
	id: string;
	title: string;
}

interface INavItemDivider extends INavItemBase {
	type: "divider";
}

interface INavButtonBase extends INavItemBase {
	type: "item" | "group";
	url?: string;
	disabled?: boolean;
	icon: React.ElementType;
	badge?: {
		content: string | number;
		colorPalette?: string;
	};
}

interface INavItemGroup extends INavButtonBase {
	type: "group";
	children: INavButtonBase[];
}

export type NavItemType = INavItemDivider | INavButtonBase | INavItemGroup;

export const navItems: NavItemType[] = [
	// --- Workspace / Quick Access
	{
		icon: TbSmartHome,
		id: "home",
		title: "Home",
		type: "item",
		url: "/",
	},
	{
		icon: Lightbulb,
		id: "discover",
		title: "Discover",
		type: "item",
	},

	// --- Network
	{
		children: [
			{
				icon: LuNetwork,
				id: "reverse-proxy",
				title: "Reverse Proxy",
				type: "item",
			},
			{ icon: Earth, id: "dns", title: "DNS", type: "item" },
			{
				disabled: true,
				icon: LuWaypoints,
				id: "map",
				title: "Map",
				type: "item",
			},
			{
				icon: SquareActivity,
				id: "monitoring",
				title: "Monitoring",
				type: "item",
			},
			{ icon: BrickWallFire, id: "firewall", title: "Firewall", type: "item" },
		],
		icon: LuNetwork,
		id: "network_group",
		title: "Network",
		type: "group",
	},

	// --- Access
	{
		children: [
			{ icon: UserLock, id: "accounts", title: "Accounts", type: "item" },
			{ icon: LogIn, id: "sso", title: "SSO", type: "item" },
			{ icon: ShieldCheck, id: "security", title: "Security", type: "item" },
			{ icon: Mail, id: "email", title: "Email", type: "item" },
		],
		icon: UserLock,
		id: "access_group",
		title: "Access",
		type: "group",
	},

	// --- Infrastructure
	{
		children: [
			{
				icon: SvgAnsible,
				id: "ansible",
				title: "Ansible",
				type: "item",
				url: "/ansible",
			},
			{ icon: LuServer, id: "server", title: "Server", type: "item" },
			{ icon: LuBox, id: "containers", title: "Containers", type: "item" },
			{ icon: Boxes, id: "registry", title: "Registry", type: "item" },
			{ icon: LuCloudUpload, id: "storage", title: "Storage", type: "item" },
			{ icon: FolderSync, id: "sync", title: "Sync", type: "item" },
			{ icon: LuFileText, id: "logs", title: "Logs", type: "item" },
			{ icon: ClockFading, id: "cron", title: "Cron Jobs", type: "item" },
			{ icon: LayoutGrid, id: "services", title: "Services", type: "item" },
		],
		icon: LuServer,
		id: "infrastructure_group",
		title: "Infrastructure",
		type: "group",
	},

	// --- Databases
	{
		children: [
			{ icon: LuDatabase, id: "database", title: "Database", type: "item" },
			{ icon: DatabaseBackup, id: "backups", title: "Backups", type: "item" },
		],
		icon: LuDatabase,
		id: "databases_group",
		title: "Databases",
		type: "group",
	},

	// --- Development
	{
		children: [
			{ icon: Code, id: "code", title: "Code", type: "item" },
			{ icon: LuGitlab, id: "gitlab", title: "GitLab", type: "item" },
			{ icon: LuLockKeyhole, id: "secrete", title: "Secrets", type: "item" }, // kept id 'secrete'
		],
		icon: Code,
		id: "development_group",
		title: "Development",
		type: "group",
	},

	// --- Cloud & Platforms
	{
		children: [
			{
				icon: TbCloudComputing,
				id: "cloud-computing",
				title: "Cloud Computing",
				type: "item",
			},
			{ icon: Store, id: "marketplace", title: "Marketplace", type: "item" },
			{ icon: LuTvMinimalPlay, id: "vod", title: "Video", type: "item" },
		],
		icon: TbCloudComputing,
		id: "cloud_group",
		title: "Cloud & Platforms",
		type: "group",
	},

	// --- Documentation
	{
		children: [
			{ icon: BookText, id: "docs", title: "Documentation", type: "item" },
		],
		icon: BookText,
		id: "docs_group",
		title: "Documentation",
		type: "group",
	},

	// --- Settings
	{
		children: [
			{ icon: LuSettings, id: "settings", title: "Settings", type: "item" },
		],
		icon: LuSettings,
		id: "settings_group",
		title: "Settings",
		type: "group",
	},
];
