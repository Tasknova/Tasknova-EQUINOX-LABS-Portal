import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { triggerEvaluationPipeline } from '@/lib/aiCallingEvaluation'
import { logAuditEvent } from '@/lib/aiAgentsUtils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const client = createServerClient()
    
    // Ensure the bucket exists (this is safe if it already exists, although usually handled manually,
    // but just in case, we'll try to create it or just rely on it being there)
    // We'll rely on it being created or we just upload to 'manual-call-uploads'
    
    const fileExt = file.name.split('.').pop()
    const callId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const fileName = `${callId}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await client.storage
      .from('manual-call-uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // If the bucket doesn't exist, we should create it
      if (uploadError.message.includes('Bucket not found')) {
        await client.storage.createBucket('manual-call-uploads', { public: true })
        const { error: retryError } = await client.storage
          .from('manual-call-uploads')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true,
          })
        if (retryError) {
          return NextResponse.json({ error: 'Failed to upload file to storage after creating bucket' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
      }
    }

    const { data: publicUrlData } = client.storage
      .from('manual-call-uploads')
      .getPublicUrl(fileName)
      
    const publicUrl = publicUrlData.publicUrl

    // Create a synthetic AI agent record if it doesn't exist just in case foreign keys require it
    // Actually, agent_id in ai_calls might be a foreign key to ai_agents.
    // Let's check if agent_id 'MANUAL_UPLOAD' exists, if not, create it.
    const { data: agentCheck } = await client.from('ai_agents').select('agent_id').eq('agent_id', 'MANUAL_UPLOAD').single()
    if (!agentCheck) {
      await client.from('ai_agents').insert({
        agent_id: 'MANUAL_UPLOAD',
        name: 'Manual Upload',
        system_prompt: 'N/A',
        status: 'active'
      })
    }

    // Insert synthetic call record
    const { error: insertError } = await client.from('ai_calls').insert({
      call_id: callId,
      agent_id: 'MANUAL_UPLOAD',
      customer_number: 'Upload',
      status: 'completed',
      recording_url: publicUrl,
      transcript_status: 'completed',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration: 0,
      agent_config: { filename: file.name }
    })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 })
    }
    
    // Also insert empty transcript record so evaluation pipeline doesn't complain
    await client.from('ai_transcripts').insert({
      call_id: callId,
      history: [],
      raw_text: ''
    })

    // Trigger pipeline
    await triggerEvaluationPipeline({
      callId,
      recordingUrl: publicUrl,
    })

    await logAuditEvent('manual.upload.completed', { call_id: callId, filename: file.name })

    return NextResponse.json({ success: true, call_id: callId })
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
