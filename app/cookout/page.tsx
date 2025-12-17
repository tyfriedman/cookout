'use client';

import { useEffect, useState, useCallback } from 'react';
import CookoutCreateInvitation from '@/app/components/CookoutCreateInvitation';

type Invitation = {
  invitation_id: number;
  creator_username: string;
  recipe_id: number;
  recipe_name: string;
  cookout_date: string;
  created_at: string;
  status: string;
  confirmed_at: string | null;
  is_creator: boolean;
};

type InvitationDetail = {
  invitation_id: number;
  creator_username: string;
  recipe_id: number;
  recipe_name: string;
  cookout_date: string;
  created_at: string;
  ingredients: Array<{
    index: number;
    name: string;
    is_creator_provided: boolean;
    provided_by: string[];
    is_covered: boolean;
  }>;
  participants: Array<{
    username: string;
    status: string;
  }>;
};

export default function CookoutPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [view, setView] = useState<'main' | 'create' | 'view-invitation'>('main');
  const [selectedInvitationId, setSelectedInvitationId] = useState<number | null>(null);
  
  // Invitations list
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  
  // View invitation state
  const [invitationDetail, setInvitationDetail] = useState<InvitationDetail | null>(null);
  const [selectedIngredientsToBring, setSelectedIngredientsToBring] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  // Define fetchInvitations before useEffects that use it
  const fetchInvitations = useCallback(async () => {
    if (!username) return;
    try {
      setLoadingInvitations(true);
      const response = await fetch(`/api/cookout/invitations?username=${username}`);
      const data = await response.json();
      if (response.ok) {
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      // Error fetching invitations
    } finally {
      setLoadingInvitations(false);
    }
  }, [username]);

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
  }, []);

  // Fetch invitations when username is available
  useEffect(() => {
    if (username) {
      fetchInvitations();
    }
  }, [username, fetchInvitations]);


  // Refetch invitations when returning to main view
  useEffect(() => {
    if (view === 'main' && username) {
      fetchInvitations();
    }
  }, [view, username, fetchInvitations]);

  async function acceptInvitation(invitationId: number) {
    if (!username) return;
    try {
      const response = await fetch('/api/cookout/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: invitationId,
          username: username,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Refresh invitations list
        fetchInvitations();
      }
    } catch (err) {
      // Error accepting invitation
    }
  }

  async function fetchInvitationDetail(invitationId: number) {
    try {
      const response = await fetch(`/api/cookout/invitation/${invitationId}`);
      const data = await response.json();
      if (response.ok && data.invitation) {
        setInvitationDetail(data.invitation);
        // Pre-select ingredients that are already covered
        const coveredIndices = new Set(
          data.invitation.ingredients
            .filter((ing: any) => ing.is_covered)
            .map((ing: any) => ing.index)
        );
        setSelectedIngredientsToBring(new Set());
      }
    } catch (err) {
      // Error fetching invitation detail
    }
  }


  async function confirmIngredients() {
    if (!username || !selectedInvitationId) return;

    setConfirming(true);
    try {
      const response = await fetch('/api/cookout/confirm-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: selectedInvitationId,
          username: username,
          ingredient_indices: Array.from(selectedIngredientsToBring),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setView('main');
        fetchInvitations();
      }
    } catch (err) {
      // Error confirming ingredients
    } finally {
      setConfirming(false);
    }
  }

  function handleViewInvitation(invitationId: number) {
    setSelectedInvitationId(invitationId);
    fetchInvitationDetail(invitationId);
    setView('view-invitation');
  }

  if (!username) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontSize: 18, color: '#6b7280' }}>Please log in to use Cookout features</p>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <CookoutCreateInvitation
        username={username}
        onClose={() => setView('main')}
        onCreated={() => {
          setView('main');
          fetchInvitations();
        }}
      />
    );
  }

  if (view === 'view-invitation' && invitationDetail) {
    const isCreator = invitationDetail.creator_username === username;
    const availableIngredients = invitationDetail.ingredients.filter(ing => !ing.is_covered);

    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => {
              setView('main');
              setSelectedInvitationId(null);
              setInvitationDetail(null);
            }}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 28, margin: 0 }}>Cookout Invitation</h1>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              {invitationDetail.recipe_name}
            </div>
            <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
              Created by {invitationDetail.creator_username}
            </div>
            <div style={{ fontSize: 16, color: '#6b7280' }}>
              {new Date(invitationDetail.cookout_date).toLocaleString()}
            </div>
          </div>

          {!isCreator && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>What will you bring?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {availableIngredients.map((ingredient) => (
                  <label
                    key={ingredient.index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px',
                      background: selectedIngredientsToBring.has(ingredient.index) ? '#dbeafe' : '#f9fafb',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIngredientsToBring.has(ingredient.index)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIngredientsToBring);
                        if (e.target.checked) {
                          newSet.add(ingredient.index);
                        } else {
                          newSet.delete(ingredient.index);
                        }
                        setSelectedIngredientsToBring(newSet);
                      }}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 16 }}>{ingredient.name}</span>
                  </label>
                ))}
              </div>
              {availableIngredients.length === 0 && (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  All ingredients are already covered!
                </p>
              )}
            </section>
          )}

          {isCreator && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>Ingredient Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {invitationDetail.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.index}
                    style={{
                      padding: '12px',
                      background: ingredient.is_covered ? '#d1fae5' : '#fee2e2',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>{ingredient.name}</span>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>
                        {ingredient.is_creator_provided && 'You'}
                        {ingredient.is_creator_provided && ingredient.provided_by.length > 0 && ', '}
                        {ingredient.provided_by.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isCreator && availableIngredients.length > 0 && (
            <button
              onClick={confirmIngredients}
              disabled={confirming || selectedIngredientsToBring.size === 0}
              style={{
                width: '100%',
                padding: '14px',
                background: confirming || selectedIngredientsToBring.size === 0 ? '#d1d5db' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: confirming || selectedIngredientsToBring.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {confirming ? 'Confirming...' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main view - show invitations
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending' && !inv.is_creator);
  const myInvitations = invitations.filter(inv => inv.is_creator || inv.status === 'accepted');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Cookout</h1>
        <button
          onClick={() => setView('create')}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Create Invitation
        </button>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Invitations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.invitation_id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  padding: 20,
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  Invitation from {invitation.creator_username}
                </div>
                <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>
                  {invitation.recipe_name}
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 12 }}>
                  {new Date(invitation.cookout_date).toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => acceptInvitation(invitation.invitation_id)}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleViewInvitation(invitation.invitation_id)}
                    style={{
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      color: '#111827',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Invitations */}
      {myInvitations.length > 0 && (
        <section>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>
            {pendingInvitations.length > 0 ? 'My Cookouts' : 'Cookouts'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myInvitations.map((invitation) => (
              <div
                key={invitation.invitation_id}
                onClick={() => handleViewInvitation(invitation.invitation_id)}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  {invitation.is_creator ? invitation.recipe_name : `${invitation.recipe_name} (by ${invitation.creator_username})`}
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af' }}>
                  {new Date(invitation.cookout_date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loadingInvitations && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#6b7280' }}>Loading invitations...</p>
        </div>
      )}

      {!loadingInvitations && pendingInvitations.length === 0 && myInvitations.length === 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 48,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#6b7280', marginBottom: 16 }}>
            No cookout invitations yet
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
            {invitations.length === 0 ? 'No invitations found. Check the browser console for debug info.' : `Found ${invitations.length} invitation(s) but they don't match the filters.`}
          </p>
          <button
            onClick={() => setView('create')}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Your First Invitation
          </button>
        </div>
      )}
    </div>
  );
}
