import type { DirectoryModel } from "@/lib/services"

export function FindDirectoryById(dir?: DirectoryModel, id?: string | null): DirectoryModel | null {
	if (dir?.id === id) {
		return dir || null
	}
	for (const child of dir?.children || []) {
		const found = FindDirectoryById(child, id)
		if (found) {
			return found
		}
	}
	return null
}

export function FindDirectoryPathById(dir?: DirectoryModel, id?: string | null): DirectoryModel[] {
	if (!dir) return []
	if (dir.id === id) {
		return [dir]
	}
	for (const child of dir.children || []) {
		const path = FindDirectoryPathById(child, id)
		if (path.length > 0) {
			return [dir, ...path]
		}
	}
	return []
}

export function FindParentDirectoryById(dir?: DirectoryModel, id?: string | null): DirectoryModel | null {
	if (!dir || !id) return null
	for (const child of dir.children || []) {
		if (child.id === id) {
			return dir
		}
		const found = FindParentDirectoryById(child, id)
		if (found) {
			return found
		}
	}
	return null
}
