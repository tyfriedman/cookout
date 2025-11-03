'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Recipe = {
  recipe_id: number;
  name: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  sugar: number;
  description: string;
  instructions: string;
};

export default function RecipeDetailPage() {
  const { recipe_id } = useParams(); // get ID from URL
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        const res = await fetch(`/api/recipes/${recipe_id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch recipe');
        setRecipe(data.recipe);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [recipe_id]);

  if (loading) return <p>Loading recipe...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!recipe) return <p>Recipe not found</p>;

  return (
    <main style={{ padding: '40px' }}>
      <h1 style={{ fontSize: 40, marginBottom: 16 }}>{recipe.name}</h1>
      <p style={{ marginBottom: 20 }}>{recipe.calories} calories • {recipe.protein}g protein • {recipe.carb}g carbs • {recipe.sugar}g sugar • {recipe.fat}g fat</p>
      <p style={{ fontSize: 24 }}>Description:</p>
      <p style={{ marginBottom: 20 }}>blah blah blah</p>
      <p style={{ fontSize: 24 }}>Instructions:</p>
      <p>{recipe.instructions}</p>
    </main>
  );
}
