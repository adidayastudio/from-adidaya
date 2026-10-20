// Leave room for the task table and a detail/preview panel before expanding navigation.
export function projectWorkspaceLayout(width:number,editorActive:boolean){
    return {compactProjectNavigation:width<1440||(editorActive&&width<1800),collapseAppNavigation:editorActive||width<1560};
}
