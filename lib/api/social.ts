// social.ts
import { supabase } from "../supabaseClient";
import { SocialAccount, SocialPost } from "../../components/frame/social/types/social.types";

/**
 * SOCIAL ACCOUNTS
 */

export const getSocialAccounts = async (): Promise<SocialAccount[]> => {
    const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching social accounts:", JSON.stringify(error, null, 2));
        return [];
    }

    // Map database fields (snake_case) to frontend types (camelCase)
    return (data || []).map(acc => ({
        id: acc.id,
        name: acc.name,
        platform: acc.platform,
        handle: acc.handle,
        avatar: acc.avatar,
        isActive: acc.is_active,
        quota: acc.quota,
        code: acc.code,
        contentPillars: acc.content_pillars
    }));
};

export const saveSocialAccount = async (account: Partial<SocialAccount>): Promise<SocialAccount | null> => {
    const dbData = {
        name: account.name,
        platform: account.platform,
        handle: account.handle,
        avatar: account.avatar,
        is_active: account.isActive,
        quota: account.quota,
        code: account.code,
        content_pillars: account.contentPillars,
        updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

    if (account.id) {
        const { data, error } = await supabase
            .from("social_accounts")
            .update(dbData)
            .eq("id", account.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating social account:", JSON.stringify(error, null, 2));
            return null;
        }
        return {
            ...data,
            isActive: data.is_active,
            contentPillars: data.content_pillars,
            code: data.code
        };
    } else {
        const { data, error } = await supabase
            .from("social_accounts")
            .insert([dbData])
            .select()
            .single();

        if (error) {
            console.error("Error creating social account:", JSON.stringify(error, null, 2));
            return null;
        }
        return {
            ...data,
            isActive: data.is_active,
            contentPillars: data.content_pillars,
            code: data.code
        };
    }
};

export const deleteSocialAccount = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting social account:", JSON.stringify(error, null, 2));
        return false;
    }
    return true;
};

/**
 * SOCIAL POSTS
 */

export const getSocialPosts = async (accountId?: string): Promise<SocialPost[]> => {
    let query = supabase.from("social_posts").select("*");
    if (accountId) query = query.eq("account_id", accountId);

    const { data, error } = await query.order("scheduled_date", { ascending: false });

    if (error) {
        console.error("Error fetching social posts:", JSON.stringify(error, null, 2));
        return [];
    }

    return (data || []).map(post => ({
        id: post.id,
        accountId: post.account_id,
        platform: post.platform,
        title: post.title,
        caption: post.caption,
        contentType: post.content_type,
        contentPillar: post.content_pillar,
        references: post.content_references,
        scheduledDate: post.scheduled_date,
        scheduledTime: post.scheduled_time,
        status: post.status,
        priority: post.priority,
        assignee: post.assignee,
        publishedUrl: post.published_url,
        insights: post.insights
    }));
};

export const saveSocialPost = async (post: Partial<SocialPost>): Promise<SocialPost | null> => {
    const dbData = {
        account_id: post.accountId,
        platform: post.platform,
        title: post.title,
        caption: post.caption,
        content_type: post.contentType,
        content_pillar: post.contentPillar,
        content_references: post.references,
        scheduled_date: post.scheduledDate,
        scheduled_time: post.scheduledTime,
        status: post.status,
        priority: post.priority,
        assignee: post.assignee,
        published_url: post.publishedUrl,
        storyboard: post.storyboard,
        insights: post.insights,
        updated_at: new Date().toISOString()
    };

    // Remove undefined
    Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

    if (post.id) {
        const { data, error } = await supabase
            .from("social_posts")
            .update(dbData)
            .eq("id", post.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating social post:", JSON.stringify(error, null, 2));
            return null;
        }
        return {
            ...data,
            accountId: data.account_id,
            contentType: data.content_type,
            contentPillar: data.content_pillar,
            scheduledDate: data.scheduled_date,
            scheduledTime: data.scheduled_time,
            publishedUrl: data.published_url,
            storyboard: data.storyboard
        };
    } else {
        const { data, error } = await supabase
            .from("social_posts")
            .insert([dbData])
            .select()
            .single();

        if (error) {
            console.error("Error creating social post:", JSON.stringify(error, null, 2));
            return null;
        }
        return {
            ...data,
            accountId: data.account_id,
            contentType: data.content_type,
            contentPillar: data.content_pillar,
            scheduledDate: data.scheduled_date,
            scheduledTime: data.scheduled_time,
            publishedUrl: data.published_url,
            storyboard: data.storyboard
        };
    }
};

export const deleteSocialPost = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) {
        console.error("Error deleting social post:", error);
        return false;
    }
    return true;
};
