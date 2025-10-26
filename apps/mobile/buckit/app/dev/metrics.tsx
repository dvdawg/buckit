import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';

interface MetricData {
  metric_name: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  stddev_value: number;
}

interface TimeSeriesData {
  date: string;
  [key: string]: any;
}

export default function MetricsScreen() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('summary');
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (type: string = 'summary') => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('metrics', {
        body: { type }
      });

      if (response.error) {
        console.error('Error fetching metrics:', response.error);
        return;
      }

      if (type === 'summary') {
        setMetrics(response.data.data || []);
      } else {
        setTimeSeriesData(response.data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(selectedMetric);
  }, [selectedMetric]);

  const formatMetricName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value: number, metric: string) => {
    if (metric.includes('latency')) {
      return `${value.toFixed(0)}ms`;
    } else if (metric.includes('ctr') || metric.includes('coverage') || metric.includes('diversity')) {
      return `${(value * 100).toFixed(2)}%`;
    } else if (metric.includes('cpr')) {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  };

  const renderSummaryMetrics = () => (
    <View style={styles.metricsContainer}>
      {metrics.map((metric, index) => (
        <View key={index} style={styles.metricCard}>
          <Text style={styles.metricTitle}>{formatMetricName(metric.metric_name)}</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg:</Text>
            <Text style={styles.metricValue}>{formatValue(metric.avg_value, metric.metric_name)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Min:</Text>
            <Text style={styles.metricValue}>{formatValue(metric.min_value, metric.metric_name)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Max:</Text>
            <Text style={styles.metricValue}>{formatValue(metric.max_value, metric.metric_name)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>StdDev:</Text>
            <Text style={styles.metricValue}>{formatValue(metric.stddev_value, metric.metric_name)}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTimeSeriesData = () => (
    <View style={styles.timeSeriesContainer}>
      {timeSeriesData.map((data, index) => (
        <View key={index} style={styles.timeSeriesCard}>
          <Text style={styles.dateText}>
            {new Date(data.date || data.hour).toLocaleDateString()}
          </Text>
          {Object.entries(data).map(([key, value]) => {
            if (key === 'date' || key === 'hour') return null;
            return (
              <View key={key} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{formatMetricName(key)}:</Text>
                <Text style={styles.metricValue}>
                  {typeof value === 'number' ? formatValue(value, key) : value}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const metricTypes = [
    { key: 'summary', label: 'Summary' },
    { key: 'ctr', label: 'CTR (7d)' },
    { key: 'cpr', label: 'CPR (7d)' },
    { key: 'coverage', label: 'Coverage' },
    { key: 'diversity', label: 'Diversity' },
    { key: 'latency', label: 'Latency' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendation Metrics</Text>
      
      <ScrollView 
        horizontal 
        style={styles.tabContainer}
        showsHorizontalScrollIndicator={false}
      >
        {metricTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.tab,
              selectedMetric === type.key && styles.activeTab
            ]}
            onPress={() => setSelectedMetric(type.key)}
          >
            <Text style={[
              styles.tabText,
              selectedMetric === type.key && styles.activeTabText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => fetchMetrics(selectedMetric)} />
        }
      >
        {selectedMetric === 'summary' ? renderSummaryMetrics() : renderTimeSeriesData()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  tabContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsContainer: {
    gap: 16,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timeSeriesContainer: {
    gap: 12,
  },
  timeSeriesCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
});
