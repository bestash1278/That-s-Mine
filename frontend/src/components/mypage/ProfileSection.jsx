import { useState } from 'react';
import { Check, LogOut, Pencil } from 'lucide-react';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import Input from '../common/Input.jsx';
import { updateMe } from '../../api/auth.js';
import { toUserError } from '../../api/client.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLogout } from '../../hooks/useLogout.js';
import { PASSWORD_RULES, validateProfileEdit } from '../../utils/authValidation.js';
import { formatDate } from '../../utils/dateUtils.js';

const EMPTY = { nickname: '', currentPassword: '', newPassword: '', newPasswordConfirm: '' };

/** 회원 정보 조회·수정(닉네임, 비밀번호) + 로그아웃 */
export default function ProfileSection() {
  const { user, isAdmin, setUser } = useAuth();
  const handleLogout = useLogout();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setForm({ ...EMPTY, nickname: user?.nickname || '' });
    setErrors({});
    setMessage('');
    setEditing(true);
  };
  const change = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const { errors: found, patch } = validateProfileEdit(form, user);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!patch) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe(patch);
      setUser(updated);
      setEditing(false);
      setMessage(patch.newPassword ? '회원 정보와 비밀번호를 바꿨어요.' : '회원 정보를 바꿨어요.');
    } catch (err) {
      const ue = toUserError(err, '회원 정보를 바꾸지 못했습니다.');
      setErrors(ue.fieldErrors);
      if (!Object.keys(ue.fieldErrors).length) setMessage(ue.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Card>
        <form noValidate onSubmit={save} className="space-y-4">
          <h2 className="text-lg font-bold text-text">회원 정보 수정</h2>
          <p className="text-sm text-sub">이메일은 바꿀 수 없어요. ({user?.email})</p>
          <Input label="닉네임" name="nickname" value={form.nickname} onChange={change('nickname')} required maxLength={20} error={errors.nickname} />
          <fieldset className="space-y-3 rounded border border-gray-200 p-3">
            <legend className="px-1 text-sm font-medium text-text">비밀번호 변경 (바꿀 때만 입력)</legend>
            <Input
              label="현재 비밀번호"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={change('currentPassword')}
              error={errors.currentPassword}
            />
            <Input
              label="새 비밀번호"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={change('newPassword')}
              error={errors.newPassword}
              helperText={PASSWORD_RULES.map((r) => r.label).join(' · ')}
            />
            <Input
              label="새 비밀번호 확인"
              name="newPasswordConfirm"
              type="password"
              autoComplete="new-password"
              value={form.newPasswordConfirm}
              onChange={change('newPasswordConfirm')}
              error={errors.newPasswordConfirm}
            />
          </fieldset>
          {message && (
            <p role="alert" className="text-sm text-error">
              {message}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={saving} className="flex-[2]">
              {saving ? '저장하는 중…' : '저장'}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-sub">닉네임</dt>
        <dd className="font-medium text-text">{user?.nickname}</dd>
        <dt className="text-sub">이메일</dt>
        <dd className="font-medium text-text">{user?.email}</dd>
        <dt className="text-sub">가입일</dt>
        <dd className="text-text">{formatDate(user?.createdAt)}</dd>
        {isAdmin && (
          <>
            <dt className="text-sub">권한</dt>
            <dd className="font-medium text-primary">관리자</dd>
          </>
        )}
      </dl>
      {message && (
        <p role="status" className="flex items-center gap-1 text-sm text-success">
          <Check size={16} aria-hidden="true" /> {message}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={start} className="flex-1">
          <Pencil size={16} className="mr-2" aria-hidden="true" /> 회원 정보 수정
        </Button>
        <Button variant="secondary" onClick={handleLogout} className="flex-1">
          <LogOut size={16} className="mr-2" aria-hidden="true" /> 로그아웃
        </Button>
      </div>
    </Card>
  );
}
