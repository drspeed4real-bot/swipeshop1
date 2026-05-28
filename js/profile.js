
    // يشتغل على الوصف فقط
    function fixDescOnly() {
        document.querySelectorAll('.swipe-desc-only').forEach(el => {
            let t = el.textContent || '';
            // احذف الحروف المتكررة الغريبة
            t = t.replace(/(.)\1{10,}/g, '');
            // حد 50 كلمة
            let words = t.trim().split(/\s+/).filter(w => w);
            if (words.length > 50) {
                el.textContent = words.slice(0, 50).join(' ') + '...';
            }
        });
    }
    // شغله مرة واحدة بعد تحميل الصفحة، وعند إضافة محتوى جديد
    document.addEventListener('DOMContentLoaded', fixDescOnly);
    // MutationObserver بدل setInterval
    const _descObserver = new MutationObserver(fixDescOnly);
    _descObserver.observe(document.getElementById('feedContainer') || document.body, { childList: true, subtree: true });
    
    // تبديل عرض تعديل البروفايل
    function toggleEditProfile() {
        const modal = document.getElementById('editProfileSection');
        if (!modal) return;
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            // جيب البيانات من currentUser.user_metadata
            const meta = currentUser?.user_metadata || {};
            document.getElementById('editUsername').value = meta.username || '';
            document.getElementById('editBio').value = meta.bio || '';
            document.getElementById('editPhone').value = meta.phone || '';
        }
    }
    
    // حفظ البروفايل
    async function saveProfile() {
        const username = document.getElementById('editUsername').value.trim();
        const bio = document.getElementById('editBio').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        
        if (!username) {
            alert('Username is required');
            return;
        }
        
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        
        try {
            // حفظ في Supabase user metadata
            const { error } = await supabaseClient.auth.updateUser({
                data: { 
                    username: username,
                    bio: bio,
                    phone: phone
                }
            });
            
            if (error) throw error;
            
            // حدث currentUser محلياً
            currentUser.user_metadata = { 
                ...currentUser.user_metadata, 
                username, 
                bio, 
                phone 
            };
            
            // حدث الواجهة فوراً
            document.getElementById('profileUsername').textContent = '@' + username;
            document.getElementById('profileBio').textContent = bio;
            // عرض رقم الهاتف
            const phoneEl = document.getElementById('profilePhone');
            const meta = currentUser?.user_metadata || {};
            if (meta.phone) {
                phoneEl.textContent = '📞 ' + meta.phone;
                phoneEl.classList.remove('hidden');
            } else {
                phoneEl.classList.add('hidden');
            }
            
            toggleEditProfile();
            alert('Profile updated successfully!');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile: ' + error.message);
        }
    }
    
    // تحديث بيانات البروفايل المعروضة
    function loadProfileData() {
        if (currentUser) {
            const meta = currentUser.user_metadata || {};
            document.querySelectorAll('.profile-username').forEach(el => el.textContent = '@' + (meta.username || 'seller'));
            document.querySelectorAll('.profile-bio').forEach(el => el.textContent = meta.bio || '');
        }
    }




    