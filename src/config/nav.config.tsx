import {
	BookOpen,
	BookText,
	Boxes,
	BrickWallFire,
	ChartPie,
	ClockFading,
	Code,
	DatabaseBackup,
	Earth,
	FolderSync,
	LayoutGrid,
	Lightbulb,
	ListTodo,
	LogIn,
	Mail,
	Network,
	Route,
	Settings,
	ShieldCheck,
	SquareActivity,
	Store,
	UserLock,
} from "lucide-react"
import type React from "react"
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
} from "react-icons/lu"
import { TbCloudComputing, TbSmartHome } from "react-icons/tb"
import SvgAnsible from "@/icons/Ansible"

interface INavItemBase {
	id: string
	title: string
}

interface INavItemDivider extends INavItemBase {
	type: "divider"
}

interface INavButtonBase extends INavItemBase {
	type: "item" | "group"
	mode?: "submenu" | "list"
	url?: string
	disabled?: boolean
	icon: React.ElementType
	children?: NavItemType[]
	badge?: {
		content: string | number
		colorPalette?: string
	}
}

export type NavItemType = INavItemDivider | INavButtonBase

export const navItems: NavItemType[] = [
	// --- Workspace / Quick Access
	{
		icon: TbSmartHome,
		id: "home",
		title: "Home",
		type: "item",
		url: "/home",
	},
	{
		icon: Lightbulb,
		id: "discover",
		title: "Discover",
		type: "item",
		url: "/ansible",
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
				children: [
					{
						icon: ChartPie,
						id: "ansible-overview",
						title: "Overview",
						type: "item",
					},
					{
						icon: BookOpen,
						id: "playbooks",
						title: "playbooks",
						type: "item",
						url: "/ansible/playbooks",
					},
					{
						icon: Route,
						id: "ansible-actions",
						title: "Actions",
						type: "item",
					},
					{
						icon: ListTodo,
						id: "jobs",
						title: "Jobs",
						type: "item",
						url: "/ansible/jobs",
					},
					{
						icon: ClockFading,
						id: "tasks",
						title: "Tasks",
						type: "item",
						url: "/ansible/tasks",
					},
					{
						icon: Settings,
						id: "ansible-setting",
						title: "Settings",
						type: "item",
						url: "/ansible/settings",
					},
				],
				icon: SvgAnsible,
				id: "ansible",
				mode: "list",
				title: "Ansible",
				type: "group",
			},
			{
				children: [
					{
						icon: ChartPie,
						id: "overview",
						title: "Overview",
						type: "item",
					},
					{
						icon: LuServer,
						id: "server-list",
						title: "Servers",
						type: "item",
					},
					{
						icon: LuWaypoints,
						id: "map",
						title: "Graph",
						type: "item",
					},
					{
						icon: Network,
						id: "server-network",
						title: "Network",
						type: "item",
					},
				],
				icon: LuServer,
				id: "servers",
				mode: "list",
				title: "Servers",
				type: "group",
			},
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
]
