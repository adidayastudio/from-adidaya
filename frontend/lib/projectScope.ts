export interface ScopeOption { id: string; name: string; code: string; description: string; isActive: boolean; }
export function scopeOptions(scopes: { id: string; projectTypeId?: string; name: string; code?: string; description?: string; isActive: boolean }[]): ScopeOption[] {
    return scopes.filter(scope => scope.isActive).map(scope => ({ id: scope.projectTypeId || scope.id, name: scope.name, code: scope.code || '', description: scope.description || '', isActive: true }));
}
export function resolveProjectScope(meta: Record<string, any>, options: ScopeOption[]): ScopeOption | undefined {
    for (const value of [meta.type, meta.scopeId, meta.projectType]) {
        if (typeof value !== 'string') continue;
        const key = value.trim().toLowerCase();
        const match = options.find(option => [option.id, option.name, option.code].some(candidate => candidate.toLowerCase() === key));
        if (match) return match;
    }
    return undefined;
}
