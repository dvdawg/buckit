import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RecommendationItem } from '../lib/recommendations';

interface RecommendationCardProps {
  item: RecommendationItem;
  onPress: (itemId: string) => void;
  onLike: (itemId: string) => void;
  onSave: (itemId: string) => void;
  onComplete: (itemId: string) => void;
}

export function RecommendationCard({ 
  item, 
  onPress, 
  onLike, 
  onSave, 
  onComplete 
}: RecommendationCardProps) {
  const formatScore = (score: number) => {
    return (score * 100).toFixed(0);
  };

  const getScoreColor = (score: number) => {
    if (score > 0.5) return '#4CAF50';
    if (score > 0.2) return '#FF9800';
    return '#F44336';
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.itemId}>Item: {item.id.slice(0, 8)}...</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
          <Text style={styles.scoreText}>{formatScore(item.score)}%</Text>
        </View>
      </View>
      
      <View style={styles.reasons}>
        <Text style={styles.reasonsTitle}>Recommendation Reasons:</Text>
        <View style={styles.reasonRow}>
          <Text style={styles.reasonLabel}>Trait Match:</Text>
          <Text style={styles.reasonValue}>{(item.reasons.trait * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.reasonRow}>
          <Text style={styles.reasonLabel}>Current State:</Text>
          <Text style={styles.reasonValue}>{(item.reasons.state * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.reasonRow}>
          <Text style={styles.reasonLabel}>Social:</Text>
          <Text style={styles.reasonValue}>{(item.reasons.social * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.reasonRow}>
          <Text style={styles.reasonLabel}>Popularity:</Text>
          <Text style={styles.reasonValue}>{(item.reasons.poprec * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.reasonRow}>
          <Text style={styles.reasonLabel}>Cost Penalty:</Text>
          <Text style={[styles.reasonValue, { color: '#F44336' }]}>
            -{(item.reasons.cost * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton]} 
          onPress={() => onLike(item.id)}
        >
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.saveButton]} 
          onPress={() => onSave(item.id)}
        >
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.completeButton]} 
          onPress={() => onComplete(item.id)}
        >
          <Text style={styles.actionText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reasons: {
    marginBottom: 16,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#888',
  },
  reasonValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  likeButton: {
    backgroundColor: '#E3F2FD',
  },
  saveButton: {
    backgroundColor: '#F3E5F5',
  },
  completeButton: {
    backgroundColor: '#E8F5E8',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
