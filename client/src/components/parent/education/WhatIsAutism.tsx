import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Brain, Heart, Users, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

export function WhatIsAutism() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">What is Autism Spectrum Disorder?</h1>
        <p className="text-lg text-muted-foreground">
          Understanding autism and how early screening can help
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Understanding Autism Spectrum Disorder (ASD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-4">
            Autism Spectrum Disorder (ASD) is a neurodevelopmental condition characterized by differences in social
            communication, interaction, and restricted or repetitive behaviors. It's called a "spectrum" because
            it affects individuals differently and to varying degrees.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Key Fact:</strong> Autism affects about 1 in 54 children, and early identification and
              intervention can significantly improve outcomes.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Social Communication Differences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-3">May include:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Difficulty understanding social cues and body language</li>
              <li>• Challenges with back-and-forth conversation</li>
              <li>• Delayed language development or unusual speech patterns</li>
              <li>• Difficulty making or keeping friends</li>
              <li>• Taking language literally</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Restricted and Repetitive Behaviors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-3">May include:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Repetitive movements (hand-flapping, rocking)</li>
              <li>• Intense focus on specific interests or topics</li>
              <li>• Strong preference for routines and sameness</li>
              <li>• Sensory sensitivities (to sounds, lights, textures)</li>
              <li>• Unusual play patterns</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The Importance of Early Screening</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-semibold text-foreground">Early Identification</h4>
                <p className="text-sm text-muted-foreground">
                  Catch potential concerns before they become more challenging
                </p>
              </div>
              <div className="text-center">
                <Heart className="h-8 w-8 text-destructive mx-auto mb-2" />
                <h4 className="font-semibold text-foreground">Better Outcomes</h4>
                <p className="text-sm text-muted-foreground">
                  Early intervention can improve communication and social skills
                </p>
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-foreground">Family Support</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with resources and support services sooner
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Myths vs. Facts About Autism</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Myth: Vaccines cause autism</p>
                  <p className="text-sm text-destructive">
                    <strong>Fact:</strong> Extensive research has shown no link between vaccines and autism.
                    This myth has been thoroughly debunked by numerous studies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-primary/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-primary">Fact: Autism affects all ethnic and socioeconomic groups</p>
                  <p className="text-sm text-primary">
                    Autism occurs across all backgrounds and is not caused by parenting style or family environment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800">Fact: People with autism can lead fulfilling lives</p>
                  <p className="text-sm text-blue-700">
                    With appropriate support and understanding, individuals with autism can achieve their goals
                    and contribute meaningfully to society.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screening Tools Used</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">M-CHAT-R (Modified Checklist for Autism in Toddlers)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                A validated screening tool that asks parents questions about their child's behavior and development.
                It helps identify children who may benefit from further evaluation for autism spectrum disorder.
              </p>
              <Badge variant="outline">Ages 16-30 months</Badge>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">ASQ-3 (Ages & Stages Questionnaires)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                A developmental screening tool that assesses communication, motor skills, problem-solving,
                and personal-social development across multiple age ranges.
              </p>
              <Badge variant="outline">Ages 1 month to 5½ years</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/20 border">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">Remember: Early Screening Saves Time</h3>
            <p className="text-primary mb-4">
              Screening is not a diagnosis—it's a way to identify children who may need additional support.
              The earlier developmental concerns are identified, the sooner interventions can begin.
            </p>
            <div className="bg-card p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Next Steps:</strong> If screening results suggest further evaluation, discuss them with
                your pediatrician or a developmental specialist. They can help determine the best path forward
                for your child.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
